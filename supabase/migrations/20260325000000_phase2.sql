-- cookbook_shares: permission-based sharing for private cookbooks
CREATE TABLE cookbook_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cookbook_id uuid NOT NULL REFERENCES cookbooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission text NOT NULL CHECK (permission IN ('view', 'edit')),
  granted_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cookbook_id, user_id)
);

-- video_path: stores full public URL in recipe-videos Supabase Storage bucket
ALTER TABLE recipes ADD COLUMN video_path text;

-- Replace old visibility constraint (had 'shared') with corrected one ('public', 'private')
ALTER TABLE cookbooks DROP CONSTRAINT IF EXISTS cookbooks_visibility_check;
ALTER TABLE cookbooks ADD CONSTRAINT cookbooks_visibility_check
  CHECK (visibility IN ('public', 'private'));

-- Indexes for cookbook_shares
CREATE INDEX IF NOT EXISTS idx_cookbook_shares_cookbook_id ON cookbook_shares(cookbook_id);
CREATE INDEX IF NOT EXISTS idx_cookbook_shares_user_id ON cookbook_shares(user_id);
