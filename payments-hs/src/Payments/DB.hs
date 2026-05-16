{-# LANGUAGE OverloadedStrings #-}

module Payments.DB
  ( Db (..),
    withDb,
    migrate,
    insertIdempotency,
    lookupIdempotency,
    insertIntent,
    getIntent,
    updateIntentStatus,
    insertWebhookEvent,
  )
where

import Control.Exception (bracket)
import Data.Aeson (Value, encode)
import qualified Data.ByteString.Lazy as LBS
import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.Text.Encoding as TE
import Database.SQLite.Simple
import Database.SQLite.Simple.FromRow
import Payments.Types

newtype Db = Db {conn :: Connection}

withDb :: FilePath -> (Db -> IO a) -> IO a
withDb fp = bracket (Db <$> open fp) (close . conn)

migrate :: Db -> IO ()
migrate db = do
  execute_ (conn db) "PRAGMA journal_mode=WAL;"
  execute_ (conn db) "PRAGMA foreign_keys=ON;"
  execute_
    (conn db)
    "CREATE TABLE IF NOT EXISTS payment_intents (intent_id TEXT PRIMARY KEY, user_id TEXT, order_id TEXT NOT NULL UNIQUE, payment_session_id TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);"
  execute_
    (conn db)
    "CREATE TABLE IF NOT EXISTS idempotency (key TEXT PRIMARY KEY, intent_id TEXT NOT NULL, created_at TEXT NOT NULL);"
  execute_
    (conn db)
    "CREATE TABLE IF NOT EXISTS payment_events (event_id TEXT PRIMARY KEY, order_id TEXT NOT NULL, event_type TEXT NOT NULL, signature_ok INTEGER NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL);"
  execute_ (conn db) "CREATE INDEX IF NOT EXISTS idx_payment_events_order ON payment_events(order_id, created_at);"

insertIdempotency :: Db -> Text -> Text -> Text -> IO ()
insertIdempotency db key intentId createdAtIso =
  execute
    (conn db)
    "INSERT OR IGNORE INTO idempotency(key,intent_id,created_at) VALUES (?,?,?)"
    (key, intentId, createdAtIso)

lookupIdempotency :: Db -> Text -> IO (Maybe Text)
lookupIdempotency db key = do
  rows <- query (conn db) "SELECT intent_id FROM idempotency WHERE key = ? LIMIT 1" (Only key) :: IO [Only Text]
  case rows of
    [Only i] -> pure (Just i)
    _ -> pure Nothing

insertIntent :: Db -> PaymentIntent -> IO ()
insertIntent db p =
  execute
    (conn db)
    "INSERT INTO payment_intents(intent_id,user_id,order_id,payment_session_id,amount,currency,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)"
    ( intentId p,
      userId p,
      cfOrderId p,
      paymentSessionId p,
      amount (money_ p),
      currency (money_ p),
      statusText (status p),
      createdAt p,
      updatedAt p
    )

getIntent :: Db -> Text -> IO (Maybe PaymentIntent)
getIntent db iid = do
  rows <-
    query
      (conn db)
      "SELECT intent_id,user_id,order_id,payment_session_id,amount,currency,status,created_at,updated_at FROM payment_intents WHERE intent_id = ? LIMIT 1"
      (Only iid) ::
      IO [IntentRow]
  case rows of
    [r] -> pure (Just (fromRowIntent r))
    _ -> pure Nothing

updateIntentStatus :: Db -> Text -> IntentStatus -> Text -> IO ()
updateIntentStatus db orderIdV newStatus updatedAtIso = do
  execute
    (conn db)
    "UPDATE payment_intents SET status = ?, updated_at = ? WHERE order_id = ?"
    (statusText newStatus, updatedAtIso, orderIdV)

insertWebhookEvent :: Db -> Text -> Text -> Bool -> Value -> Text -> IO ()
insertWebhookEvent db eventId orderIdV eventType sigOk payload createdAtIso = do
  let sigVal :: Int
      sigVal = if sigOk then 1 else 0
      payloadStr = TE.decodeUtf8 (LBS.toStrict (encode payload))
  execute
    (conn db)
    "INSERT OR IGNORE INTO payment_events(event_id,order_id,event_type,signature_ok,payload_json,created_at) VALUES (?,?,?,?,?,?)"
    (eventId, orderIdV, eventType, sigVal, payloadStr, createdAtIso)

data IntentRow = IntentRow Text (Maybe Text) Text Text Double Text Text Text Text

instance FromRow IntentRow where
  fromRow = IntentRow <$> field <*> field <*> field <*> field <*> field <*> field <*> field <*> field <*> field

fromRowIntent :: IntentRow -> PaymentIntent
fromRowIntent (IntentRow iid uid oid ps amt cur st ca ua) =
  PaymentIntent
    { intentId = iid,
      userId = uid,
      cfOrderId = oid,
      paymentSessionId = ps,
      status = parseStatus st,
      createdAt = ca,
      updatedAt = ua,
      money_ = Money {amount = amt, currency = cur}
    }

parseStatus :: Text -> IntentStatus
parseStatus "CREATED" = Created
parseStatus "ACTIVE" = Active
parseStatus "PAID" = Paid
parseStatus "FAILED" = Failed
parseStatus "CANCELLED" = Cancelled
parseStatus _ = Created

statusText :: IntentStatus -> Text
statusText Created = "CREATED"
statusText Active = "ACTIVE"
statusText Paid = "PAID"
statusText Failed = "FAILED"
statusText Cancelled = "CANCELLED"
