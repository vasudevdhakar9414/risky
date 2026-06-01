-- ============================================================
-- RiskyVasu: Supabase Schema Update
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add 'role' column to profiles table (if it doesn't already exist)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- 2. Add 'email' column to profiles (in case it's missing)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Create index on username for fast username-based login lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles (username);

-- 4. Grant your first admin role
-- Replace 'YOUR_USERNAME_HERE' with the actual username of the admin account
-- Example: UPDATE profiles SET role = 'admin' WHERE username = 'vasu';
UPDATE profiles SET role = 'admin' WHERE username = 'YOUR_USERNAME_HERE';

-- 5. Enable RLS policies on profiles
-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow admins to read all profiles (for Admin Panel)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to update all profiles (for role management)
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow admins to delete profiles (for user removal)
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Add 'mistakes' column to trades table if not present
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS mistakes TEXT[] DEFAULT '{}';

-- Allow admins to view all trades
DROP POLICY IF EXISTS "Admins can view all trades" ON trades;
CREATE POLICY "Admins can view all trades"
  ON trades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'trade_created', 'trade_updated', 'trade_deleted', 'user_created', 'role_changed', 'announcement'
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to update their own notifications (e.g. mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow anyone to insert notifications (so trade actions can trigger notifications)
DROP POLICY IF EXISTS "Anyone can insert notifications" ON notifications;
CREATE POLICY "Anyone can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (TRUE);

-- 8. SaaS Premium Extensions
-- Add starting balance, broker details, and suspension status to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS starting_balance NUMERIC NOT NULL DEFAULT 10000;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS broker_name TEXT NOT NULL DEFAULT 'Generic Broker';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'Live';

-- Add strategy checklist and compliance data to trades
ALTER TABLE trades ADD COLUMN IF NOT EXISTS compliance_score INTEGER DEFAULT 100;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS checked_rules TEXT[] DEFAULT '{}';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS certificate_id UUID DEFAULT gen_random_uuid();

-- Add rules checklist and risk bounds to strategies
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS rules TEXT[] DEFAULT '{}';
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS risk_parameters JSONB DEFAULT '{}';
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- ============================================================
-- After running this:
-- 1. Go to Supabase → Authentication → Settings
-- 2. Disable "Confirm email" (set to OFF) for invite-only login
-- 3. Set your first user's role to 'admin' using the UPDATE above
-- ============================================================
