
ALTER TABLE booking_taker_assignments
  ADD COLUMN IF NOT EXISTS taker_name TEXT,
  ADD COLUMN IF NOT EXISTS taker_protocol TEXT,
  ADD COLUMN IF NOT EXISTS taker_host TEXT,
  ADD COLUMN IF NOT EXISTS taker_port TEXT,
  ADD COLUMN IF NOT EXISTS taker_stream_key TEXT,
  ADD COLUMN IF NOT EXISTS taker_username TEXT,
  ADD COLUMN IF NOT EXISTS taker_password TEXT,
  ADD COLUMN IF NOT EXISTS taker_audio TEXT,
  ADD COLUMN IF NOT EXISTS taker_quality TEXT,
  ADD COLUMN IF NOT EXISTS taker_email_subject TEXT,
  ADD COLUMN IF NOT EXISTS taker_communication_method TEXT,
  ADD COLUMN IF NOT EXISTS taker_phone_number TEXT;
