-- Add site_info column to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS site_info JSONB DEFAULT '{}'::jsonb;

-- Add last_seen column to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- Create or replace function to update site_info
CREATE OR REPLACE FUNCTION update_user_site_info(
  user_id_param UUID,
  site_info_param JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_settings
  SET 
    site_info = site_info_param,
    last_seen = NOW()
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_site_info TO authenticated;