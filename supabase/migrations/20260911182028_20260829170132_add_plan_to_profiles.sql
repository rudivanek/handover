ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_payment_link text;