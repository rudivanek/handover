/*
# Add plan and stripe_payment_link to profiles

1. Purpose
   Support a free/paid plan model. Free plan allows one manual. Paid
   accounts hide the "Made with Handover" footer on public manuals.

2. Changes
   - profiles: add `plan` text NOT NULL DEFAULT 'free' — either 'free'
     or 'paid'.
   - profiles: add `stripe_payment_link` text — the agency's Stripe
     payment link shown on the manuals list when the free limit is
     reached. Stored per-profile so each agency can paste their own link.

3. Security
   - No policy changes needed; these are profile columns already covered
     by existing owner-scoped CRUD and the public-read policy.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_payment_link text;
