/*
  # Fix Vital Device Connection Flow

  1. Changes
    - Update get_vital_link_token to modify existing connection
    - Add device email validation
    - Improve connection status handling
*/

-- Update get_vital_link_token function to update existing connection
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
  v_device_id uuid;
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

  -- Update existing pending connection or create new one
  WITH upsert AS (
    UPDATE user_devices
    SET 
      device_email = p_device_email,
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{connection_started}',
        to_jsonb(now())
      )
    WHERE user_id = p_user_id
      AND provider = p_provider
      AND status = 'pending'
      AND created_at >= now() - interval '1 hour'
    RETURNING id
  )
  INSERT INTO user_devices (
    user_id,
    vital_user_id,
    provider,
    device_email,
    status,
    metadata
  )
  SELECT 
    p_user_id,
    v_vital_user_id,
    p_provider,
    p_device_email,
    'pending',
    jsonb_build_object(
      'connection_started', now()
    )
  WHERE NOT EXISTS (SELECT 1 FROM upsert)
  RETURNING id INTO v_device_id;

  -- Delete any old pending connections
  DELETE FROM user_devices
  WHERE user_id = p_user_id
    AND provider = p_provider
    AND status = 'pending'
    AND id != v_device_id
    AND created_at < now() - interval '1 hour';

  RETURN jsonb_build_object(
    'success', true,
    'vital_user_id', v_vital_user_id,
    'provider', p_provider,
    'device_email', p_device_email,
    'device_id', v_device_id
  );
END;
$$;