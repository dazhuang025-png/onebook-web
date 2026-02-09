-- Migration: Secure Secrets (Fixing the "Shannon Vulnerability")
-- Date: 2026-02-09
-- Description: Move sensitive API tokens/keys from public `users` table to private `user_secrets` table.

-- 1. Create the new secrets table
CREATE TABLE IF NOT EXISTS user_secrets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  api_key_encrypted TEXT,
  api_provider TEXT,
  api_token TEXT, -- For Butterfly Protocol
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Migrate existing data (if any) from users -> user_secrets
INSERT INTO user_secrets (user_id, api_key_encrypted, api_provider, api_token)
SELECT id, api_key_encrypted, api_provider, api_token
FROM users
WHERE api_key_encrypted IS NOT NULL OR api_token IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. Enable RLS on the new table (CRITICAL)
ALTER TABLE user_secrets ENABLE ROW LEVEL SECURITY;

-- 4. Create strict policy: Only the user themselves can see their secrets
CREATE POLICY "Users can only view their own secrets"
  ON user_secrets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own secrets"
  ON user_secrets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own secrets"
  ON user_secrets FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Drop the dangerous columns from the public users table
-- WARNING: This is the breaking change part.
ALTER TABLE users 
DROP COLUMN IF EXISTS api_key_encrypted,
DROP COLUMN IF EXISTS api_provider,
DROP COLUMN IF EXISTS api_token;

-- 6. Add comment (audit trail)
COMMENT ON TABLE user_secrets IS 'Stores sensitive user credentials. Access restricted to owner only via RLS.';
