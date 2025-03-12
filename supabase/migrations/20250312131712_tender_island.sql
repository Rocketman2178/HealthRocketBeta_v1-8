/*
  # Add Device Email Support

  1. Changes
    - Add device_email to user_devices table
    - Update connection functions to handle device email
    - Add validation for device email
*/

-- Add device_email to user_devices if it doesn't exist
ALTER TABLE public.user_devices
ADD COLUMN IF NOT EXISTS device_email text;

-- Update get_vital_link_token function to include device email
CREATE OR REPLACE FUNCTION get_vital_link_token(
  p_user_id uuid,
  p_provider text,
  p_device_email text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vital_user_id text;
  v_config jsonb;
BEGIN
  -- Validate email
  IF p_device_email IS NULL OR p_device_email = '' THEN
    RAISE EXCEPTION 'Device email is required';
  END IF;

  -- Get vital_user_id
  SELECT vital_user_id INTO v_vital_user_id
  FROM users
  WHERE id = p_user_id;

  IF v_vital_user_id IS NULL THEN
    RAISE EXCEPTION 'Vital user ID not found';
  END IF;

  -- Get Vital config
  SELECT jsonb_build_object(
    'api_key', value
  ) INTO v_config
  FROM vital_config
  WHERE name = 'api_key';

  -- Create pending device connection
  INSERT INTO user_devices (
    user_id,
    vital_user_id,
    provider,
    device_email,
    status,
    metadata
  ) VALUES (
    p_user_id,
    v_vital_user_id,
    p_provider,
    p_device_email,
    'pending',
    jsonb_build_object(
      'connection_started', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'vital_user_id', v_vital_user_id,
    'provider', p_provider,
    'device_email', p_device_email
  );
END;
$$;