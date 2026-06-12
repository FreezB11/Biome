{-# LANGUAGE OverloadedStrings #-}

module Payments.Cashfree
  ( createOrder,
    fetchOrder,
  )
where

import Data.Aeson (Value, eitherDecode, encode, object, (.=))
import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.Text.Encoding as TE
import qualified Data.CaseInsensitive as CI
import Network.HTTP.Client
import Network.HTTP.Client.TLS (tlsManagerSettings)
import Network.HTTP.Types (RequestHeaders, hAccept, hContentType, methodGet, methodPost, statusCode)
import Payments.Config
import Payments.Types

createOrder :: Config -> Maybe Text -> CashfreeCreateOrderReq -> IO CashfreeCreateOrderRes
createOrder cfg idempotencyKey payload = do
  manager <- newManager tlsManagerSettings
  req0 <- parseRequest (T.unpack (cashfreeBaseUrl (cashfreeEnv cfg) <> "/orders"))
  let body = encode payload
      req =
        req0
          { method = methodPost,
            requestBody = RequestBodyLBS body,
            requestHeaders =
              baseHeaders cfg
                <> [ (hAccept, "application/json"),
                     (hContentType, "application/json")
                   ]
                <> maybe [] (\k -> [(CI.mk "x-idempotency-key", TE.encodeUtf8 k)]) idempotencyKey
          }
  resp <- httpLbs req manager
  if statusCode (responseStatus resp) `elem` [200, 201]
    then case eitherDecode (responseBody resp) of
      Left e -> fail ("CASHFREE_CREATE_ORDER_DECODE_FAILED: " <> e)
      Right ok -> pure ok
    else fail ("CASHFREE_CREATE_ORDER_FAILED: HTTP_" <> show (statusCode (responseStatus resp)))

fetchOrder :: Config -> Text -> IO Value
fetchOrder cfg orderId = do
  manager <- newManager tlsManagerSettings
  req0 <- parseRequest (T.unpack (cashfreeBaseUrl (cashfreeEnv cfg) <> "/orders/" <> orderId))
  let req =
        req0
          { method = methodGet,
            requestHeaders = baseHeaders cfg <> [(hAccept, "application/json")]
          }
  resp <- httpLbs req manager
  if statusCode (responseStatus resp) == 200
    then case eitherDecode (responseBody resp) of
      Left e -> fail ("CASHFREE_GET_ORDER_DECODE_FAILED: " <> e)
      Right ok -> pure ok
    else
      pure
        ( object
            [ "error" .= ("CASHFREE_GET_ORDER_FAILED" :: Text),
              "status" .= statusCode (responseStatus resp)
            ]
        )

baseHeaders :: Config -> RequestHeaders
baseHeaders cfg =
  [ (CI.mk "x-client-id", TE.encodeUtf8 (cashfreeClientId cfg)),
    (CI.mk "x-client-secret", TE.encodeUtf8 (cashfreeClientSecret cfg)),
    (CI.mk "x-api-version", TE.encodeUtf8 (cashfreeApiVersion cfg))
  ]