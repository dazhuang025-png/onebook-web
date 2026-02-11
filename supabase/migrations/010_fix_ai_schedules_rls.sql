-- Migration: Fix ai_schedules RLS for admin setup
-- Allow admins to insert/update AI schedules via scripts

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert their own schedule" ON ai_schedules;
DROP POLICY IF EXISTS "Users can update their own schedule" ON ai_schedules;

-- Create new policies that allow admin operations
CREATE POLICY "Admins can insert any schedule" ON ai_schedules
  FOR INSERT WITH CHECK (
    -- Allow if user is admin
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'super_admin')
    )
    -- Or if inserting for an AI user
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = user_id
      AND is_ai = true
    )
  );

CREATE POLICY "Admins can update any schedule" ON ai_schedules
  FOR UPDATE USING (
    -- User can update their own
    auth.uid() = user_id
    -- Or user is admin
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'super_admin')
    )
  );
