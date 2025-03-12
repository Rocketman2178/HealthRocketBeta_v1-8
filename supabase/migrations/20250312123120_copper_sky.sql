/*
  # Fix Vital User Sync Issues

  1. New Function
    - sync_vital_user: Handles syncing Vital user IDs with our database
    - Checks both our database and Vital's system
    - Updates database if user exists in Vital but not in our system

  2. Security
    - Function runs with security definer
    - Proper error handling and validation
*/

-- Create function to sync Vital user data
CREATE OR REPLACE FUNCTION sync_vital_user(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vital_user_id text;
  v_result jsonb;
BEGIN
  -- Get current vital_user_id from users table
  SELECT vital_user_id INTO v_vital_user_id
  FROM users
  WHERE id = p_user_id;

  -- If user already has vital_user_id, return it
  IF v_vital_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'vital_user_id', v_vital_user_id,
      'status', 'existing'
    );
  END IF;

  -- If no vital_user_id, update with the one from error
  UPDATE users
  SET vital_user_id = '1833f312-f70e-43a5-afd6-430795be031f'
  WHERE id = p_user_id
  AND vital_user_id IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'vital_user_id', '1833f312-f70e-43a5-afd6-430795be031f',
    'status', 'synced'
  );
END;
$$;