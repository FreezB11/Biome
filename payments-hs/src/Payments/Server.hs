{-# LANGUAGE OverloadedStrings #-}

module Payments.Server
  ( runServer,
  )
where

import Control.Applicative ((<|>))
import Control.Monad.IO.Class (liftIO)
import Control.Monad.Reader (ReaderT, ask, runReaderT)
import Control.Monad.Trans.Class (lift)
import Data.Aeson (Value, eitherDecode, object, (.=))
import qualified Data.ByteString.Lazy as LBS
import Data.Maybe (fromMaybe)
import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.Text.Lazy as LT
import qualified Data.CaseInsensitive as CI
import Network.HTTP.Types (status200, status400, status401, status404)
import Network.Wai (requestHeaders)
import Web.Scotty.Trans hiding (status)
import qualified Web.Scotty.Trans as S
import Payments.Cashfree
import Payments.Config
import Payments.DB
import Payments.Types
import Payments.Util
import Payments.Webhook

data Env = Env
  { envCfg :: Config,
    envDb :: Db
  }

type AppM = ReaderT Env IO

runServer :: Config -> Db -> IO ()
runServer cfg db =
  scottyT (port cfg) (\m -> runReaderT m (Env cfg db)) routes

routes :: ScottyT LT.Text AppM ()
routes = do
  get "/health" $ do
    json (object ["ok" .= True])

  post "/v1/payment_intents" $ do
    waiReq <- request
    let hdrs = requestHeaders waiReq
        idempotencyKey =
          headerText (CI.mk "idempotency-key") hdrs
            <|> headerText (CI.mk "x-idempotency-key") hdrs
        userIdH = headerText (CI.mk "x-user-id") hdrs
    reqBody <- body
    env <- lift ask
    let db = envDb env
        cfg = envCfg env
    case (eitherDecode reqBody :: Either String CreateIntentReq) of
      Left _ -> do
        S.status status400
        json (object ["error" .= ("INVALID_BODY" :: Text)])
      Right input -> do
        now <- liftIO nowIso
        existing <- liftIO $ case idempotencyKey of
          Nothing -> pure Nothing
          Just k -> lookupIdempotency db k
        case existing of
          Just iid -> do
            found <- liftIO (getIntent db iid)
            case found of
              Nothing -> do
                S.status status404
                json (object ["error" .= ("IDEMPOTENCY_RECORD_BROKEN" :: Text)])
              Just intentV -> json (mkCreateRes cfg intentV)
          Nothing -> do
            iid <- liftIO newIntentId
            let ordId = fromMaybe ("order_" <> T.drop 3 iid) (orderId input)
                reqPayload =
                  CashfreeCreateOrderReq
                    { cfOrderAmount = amount (money input),
                      cfOrderCurrency = currency (money input),
                      cfoOrderId = ordId,
                      cfCustomerDetails =
                        CashfreeCustomer
                          { cfCustomerId = customerId (customer input),
                            cfCustomerPhone = customerPhone (customer input),
                            cfCustomerEmail = customerEmail (customer input),
                            cfCustomerName = customerName (customer input)
                          },
                      cfOrderMeta =
                        CashfreeOrderMeta
                          { cfReturnUrl = returnUrl input,
                            cfNotifyUrl = notifyUrl input
                          }
                    }
            cf <- liftIO $ createOrder cfg idempotencyKey reqPayload
            let intentV =
                  PaymentIntent
                    { intentId = iid,
                      userId = userIdH,
                      cfOrderId = cfRespOrderId cf,
                      paymentSessionId = cfRespPaymentSessionId cf,
                      status = Created,
                      createdAt = now,
                      updatedAt = now,
                      money_ = money input
                    }
            liftIO $ insertIntent db intentV
            case idempotencyKey of
              Nothing -> pure ()
              Just k -> liftIO $ insertIdempotency db k iid now
            json (mkCreateRes cfg intentV)

  get "/v1/payment_intents/:intentId" $ do
    iid <- param "intentId"
    env <- lift ask
    found <- liftIO $ getIntent (envDb env) iid
    case found of
      Nothing -> do
        S.status status404
        json (object ["error" .= ("NOT_FOUND" :: Text)])
      Just intentV -> json intentV

  get "/v1/payment_events" $ do
    waiReq <- request
    let hdrs = requestHeaders waiReq
        userIdH = headerText (CI.mk "x-user-id") hdrs
    env <- lift ask
    case userIdH of
      Nothing -> do
        S.status status401
        json (object ["error" .= ("UNAUTHORIZED" :: Text)])
      Just uid -> do
        orderIdV <- (Just <$> param "orderId") `rescue` (\_ -> pure Nothing)
        limitV <- (param "limit") `rescue` (\_ -> pure (50 :: Int))
        let clamped = max 1 (min 200 limitV)
        items <- liftIO $ listPaymentEventsForUser (envDb env) uid orderIdV clamped
        json (object ["items" .= items])

  post "/v1/webhooks/cashfree" $ do
    hdrs <- requestHeaders <$> request
    rawBody <- body
    env <- lift ask
    let cfg = envCfg env
        db = envDb env
        sigOk = verifyCashfreeSignature (LBS.toStrict rawBody) hdrs (cashfreeClientSecret cfg)
        decoded = eitherDecode rawBody :: Either String CashfreeWebhookEvent
    now <- liftIO nowIso
    let (ordId, evtType) =
          case decoded of
            Right evt -> (whOrderId (whOrder evt), whType evt)
            Left _ -> ("unknown" :: Text, "unknown" :: Text)
        evtId = "evt_" <> ordId <> "_" <> now
    liftIO $ insertWebhookEvent db evtId ordId evtType sigOk (decodeJson rawBody) now
    if not sigOk
      then do
        S.status status401
        json (object ["error" .= ("INVALID_SIGNATURE" :: Text)])
      else case decoded of
        Left _ -> do
          S.status status400
          json (object ["error" .= ("INVALID_JSON" :: Text)])
        Right evt -> do
          let paymentStatus = whPaymentStatus (whPayment evt)
              intentStatus =
                case paymentStatus of
                  "SUCCESS" -> Paid
                  "FAILED" -> Failed
                  "USER_DROPPED" -> Cancelled
                  _ -> Active
          liftIO $ updateIntentStatus db (whOrderId (whOrder evt)) intentStatus now
          S.status status200
          json (object ["ok" .= True])

mkCreateRes :: Config -> PaymentIntent -> CreateIntentRes
mkCreateRes cfg intentV =
  CreateIntentRes
    { intent = intentV,
      checkout =
        object
          [ "provider" .= ("cashfree" :: Text),
            "env" .= (case cashfreeEnv cfg of Sandbox -> ("sandbox" :: Text); Production -> "production"),
            "orderId" .= cfOrderId intentV,
            "paymentSessionId" .= paymentSessionId intentV
          ]
    }

decodeJson :: LBS.ByteString -> Value
decodeJson bs =
  case eitherDecode bs of
    Right v -> v
    Left _ -> object ["raw" .= T.pack (show bs)]