-- ═══════════════════════════════════════════════════════════════════════════════
-- RiskyVasu — Google OAuth Migration
-- Run in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── STEP 1: Enable Google Provider ─────────────────────────────────────────
-- This cannot be done via SQL. Do it in the Supabase Dashboard:
--
--   1. Go to: Authentication → Providers → Google
--   2. Toggle "Enable Google provider" ON
--   3. Enter your Google Cloud OAuth credentials:
--      - Client ID     (from Google Cloud Console)
--      - Client Secret (from Google Cloud Console)
--   4. Add Authorized Redirect URIs in Google Cloud Console:
--      https://<your-supabase-project>.supabase.co/auth/v1/callback
--   5. Save.
--
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── STEP 2: Allow profile upsert for OAuth users ───────────────────────────
-- When a Google user signs in for the first time, the frontend creates a new
-- profile row. This requires INSERT permission on the profiles table.
-- Also, account linking requires UPDATE on profiles.id.

-- Allow authenticated users to insert their own profile (for first-time OAuth signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ─── STEP 3: Account Linking — Allow email-based UPDATE ─────────────────────
-- When a Google user signs in and their email matches an existing profile,
-- the frontend updates the profile.id to the new auth.users.id.
-- This requires UPDATE permission on profiles rows matched by email.
-- 
-- IMPORTANT: This is handled by the frontend code in AuthContext.tsx.
-- The above "Users can update own profile" policy covers this case AFTER
-- the profile.id has been updated to match auth.uid().
--
-- For the initial linking operation (where old id ≠ auth.uid()), we need
-- a special policy. The safest approach is a Supabase Edge Function for 
-- account linking. As a simpler alternative, the service role key can be
-- used server-side. 
--
-- For now, the frontend handles this with the ANON key by matching email.
-- If the UPDATE fails due to RLS, add this temporary policy:

-- DROP POLICY IF EXISTS "Allow email-based profile linking" ON profiles;
-- CREATE POLICY "Allow email-based profile linking"
--   ON profiles FOR UPDATE
--   USING (email = auth.jwt() ->> 'email');

-- ─── STEP 4: Verify current profiles schema ─────────────────────────────────
-- Run this to confirm your current schema matches expectations:
--
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- ORDER BY ordinal_position;
--
-- Expected columns: id, username, email, currency, subscription_tier, 
--                   avatar_seed, updated_at, role, status, starting_balance,
--                   broker_name, account_type

-- ─── STEP 5: Safety check — confirm no duplicate profiles ───────────────────
-- Run this to detect any duplicate email profiles BEFORE enabling Google OAuth:
--
-- SELECT email, COUNT(*) as count
-- FROM profiles
-- GROUP BY email
-- HAVING COUNT(*) > 1;
--
-- If duplicates exist, resolve them manually before enabling Google OAuth.

-- ─── STEP 6: Verify existing admin profile ──────────────────────────────────
-- Confirm your admin user profile is correctly set up:
--
-- SELECT id, email, username, role FROM profiles WHERE role = 'admin';
--
-- The id here must match auth.users.id for the same email.
-- If there is a mismatch, run:
--
-- UPDATE profiles
-- SET id = (SELECT id FROM auth.users WHERE email = profiles.email)
-- WHERE role = 'admin';

-- ═══════════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════════
