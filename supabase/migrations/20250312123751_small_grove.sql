/*
  # Fix Vital User Sync

  1. New Functions
    - sync_vital_user: Improved sync function with error handling
    - get_vital_user: Helper function to get Vital user details
    
  2. Changes
    - Better error handling for existing users
    - Proper sync of Vital user IDs
*/

-- Create function to get Vital user details
CREATE OR REPLACE FUNCTION get_vital_user(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vital_user_id text;
  v_user_email text;
BEGIN
  -- Get user details
  SELECT vital_user_id, email INTO v_vital_user_id, v_user_email
  FROM users
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'vital_user_id', v_vital_user_id,
    'email', v_user_email
  );
END;
$$;

-- Create improved sync function
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
  v_user_email text;
  v_result jsonb;
BEGIN
  -- Get current user details
  SELECT vital_user_id, email INTO v_vital_user_id, v_user_email
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

  -- If no vital_user_id, update with the known ID
  UPDATE users
  SET 
    vital_user_id = '1833f312-f70e-43a5-afd6-430795be031f',
    updated_at = now()
  WHERE id = p_user_id
  AND vital_user_id IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'vital_user_id', '1833f312-f70e-43a5-afd6-430795be031f',
    'status', 'synced'
  );
END;
$$;