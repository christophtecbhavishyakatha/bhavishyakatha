-- Run this migration once on the target database before deploying the cron.

ALTER TABLE call_timers
  ADD COLUMN processing_attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN processing_started_at DATETIME NULL,
  ADD COLUMN last_processing_error TEXT NULL;

ALTER TABLE call_wallet_logs
  ADD UNIQUE KEY uq_call_wallet_logs_request_event
    (call_request_id, event_type);
