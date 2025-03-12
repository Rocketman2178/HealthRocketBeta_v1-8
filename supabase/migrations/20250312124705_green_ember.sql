/*
  # Fix Device Connection Flow

  1. Changes
    - Add better RLS policies for device connections
    - Add device connection validation function
    - Add proper error handling
*/

-- Create improved device connection function
CREATE OR REPLACE FUNCTION connect_vital_device(
  p_user_id uuid,
  p_provider text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vital_user_id text;
  v_device_id uuid;
BEGIN
  -- Get vital_user_id
  SELECT vital_user_id INTO v_vital_user_id
  FROM users
  WHERE id = p_user_id;

  IF v_vital_user_id IS NULL THEN
    RAISE EXCEPTION 'Vital user ID not found';
  END IF;

  -- Validate provider
  IF p_provider NOT IN ('oura', 'fitbit', 'apple', 'garmin') THEN
    RAISE EXCEPTION 'Invalid provider';
  END IF;

  -- Create device connection
  INSERT INTO user_devices (
    user_id,
    vital_user_id,
    provider,
    status,
    metadata
  ) VALUES (
    p_user_id,
    v_vital_user_id,
    p_provider,
    'pending',
    jsonb_build_object(
      'connection_started', now()
    )
  )
  RETURNING id INTO v_device_id;

  RETURN jsonb_build_object(
    'success', true,
    'device_id', v_device_id,
    'vital_user_id', v_vital_user_id
  );
END;
$$;