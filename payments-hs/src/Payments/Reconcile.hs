{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}

module Payments.Reconcile
  ( reconcileLoop,
  )
where

import Control.Concurrent (threadDelay)
import Control.Exception (SomeException, catch)
import Control.Monad (forM_)
import Data.Aeson (Value (..))
import qualified Data.Aeson.Key as K
import qualified Data.Aeson.KeyMap as KM
import Data.Text (Text)
import Payments.Cashfree
import Payments.Config
import Payments.DB
import Payments.Types
import Payments.Util

reconcileLoop :: Config -> Db -> IO ()
reconcileLoop cfg db = loop
  where
    loop = do
      reconcileOnce `catch` (\(_ :: SomeException) -> pure ())
      threadDelay (120 * 1000 * 1000)
      loop

    reconcileOnce = do
      items <- listOpenIntents db 50
      forM_ items $ \(_intentId, oid) -> do
        v <- fetchOrder cfg oid `catch` (\(_ :: SomeException) -> pure Null)
        now <- nowIso
        case extractOrderStatus v of
          Just "PAID" -> updateIntentStatus db oid Paid now
          Just "EXPIRED" -> updateIntentStatus db oid Cancelled now
          Just "ACTIVE" -> pure ()
          _ -> pure ()

extractOrderStatus :: Value -> Maybe Text
extractOrderStatus v =
  case v of
    Object o ->
      case KM.lookup (K.fromText "order_status") o of
        Just (String s) -> Just s
        _ -> Nothing
    _ -> Nothing