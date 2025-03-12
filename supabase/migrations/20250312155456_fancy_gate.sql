/*
  # Fix Vital Device Connection Flow

  1. Changes
    - Add proper device email handling
    - Fix connection status updates
    - Add better error handling
    - Add connection tracking
*/

-- Update get_vital_link_token function with improved device email handling
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
  v_api_key text;
  v_existing_device_id uuid;
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

  -- Check for existing active connection
  SELECT id INTO v_existing_device_id
  FROM user_devices
  WHERE user_id = p_user_id
    AND provider = p_provider
    AND device_email = p_device_email
    AND status = 'active';

  IF v_existing_device_id IS NOT NULL THEN
    RAISE EXCEPTION 'Device already connected with this email';
  END IF;

  -- Get API key
  SELECT value INTO v_api_key
  FROM vital_config
  WHERE name = 'api_key';

  IF v_api_key IS NULL THEN
    RAISE EXCEPTION 'Vital API key not configured';
  END IF;

  -- First try to update existing pending connection
  UPDATE user_devices
  SET 
    device_email = p_device_email,
    metadata = jsonb_build_object(
      'connection_started', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'api_key', v_api_key,
      'email_updated', true
    )
  WHERE user_id = p_user_id
    AND provider = p_provider
    AND status = 'pending'
    AND connected_at >= now() - interval '1 hour'
  RETURNING id INTO v_device_id;

  -- If no existing connection found, create new one
  IF v_device_id IS NULL THEN
    INSERT INTO user_devices (
      user_id,
      vital_user_id,
      provider,
      device_email,
      status,
      metadata,
      connected_at
    ) VALUES (
      p_user_id,
      v_vital_user_id,
      p_provider,
      p_device_email,
      'pending',
      jsonb_build_object(
        'connection_started', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'api_key', v_api_key
      ),
      now()
    )
    RETURNING id INTO v_device_id;
  END IF;

  -- Clean up old pending connections
  DELETE FROM user_devices
  WHERE user_id = p_user_id
    AND provider = p_provider
    AND status = 'pending'
    AND id != v_device_id
    AND connected_at < now() - interval '1 hour';

  RETURN jsonb_build_object(
    'success', true,
    'vital_user_id', v_vital_user_id,
    'provider', p_provider,
    'device_email', p_device_email,
    'device_id', v_device_id
  );
END;
$$;

-- Update handle_vital_webhook function with improved connection handling
CREATE OR REPLACE FUNCTION handle_vital_webhook(
  payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_provider text;
  v_status text;
  v_device_email text;
  v_device_id uuid;
BEGIN
  -- Extract data from payload
  v_provider := payload->>'provider';
  v_status := COALESCE(payload->>'status', 'active');
  v_device_email := payload->>'device_email';

  -- Get user ID from vital_user_id
  SELECT id INTO v_user_id
  FROM users
  WHERE vital_user_id = payload->>'user_id';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for Vital ID';
  END IF;

  -- First try to update device with matching email
  UPDATE user_devices ud
  SET 
    status = v_status,
    last_sync_at = CASE 
      WHEN v_status = 'active' THEN now()
      ELSE last_sync_at
    END,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{connection_completed}',
      to_jsonb(to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    )
  WHERE user_id = v_user_id
    AND provider = v_provider
    AND device_email = v_device_email
    AND status = 'pending'
  RETURNING id INTO v_device_id;

  -- If no device found with email, try latest pending
  IF v_device_id IS NULL THEN
    WITH latest_device AS (
      SELECT id
      FROM user_devices
      WHERE user_id = v_user_id
        AND provider = v_provider
        AND status = 'pending'
      ORDER BY connected_at DESC
      LIMIT 1
    )
    UPDATE user_devices ud
    SET 
      status = v_status,
      last_sync_at = CASE 
        WHEN v_status = 'active' THEN now()
        ELSE last_sync_at
      END,
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{connection_completed}',
        to_jsonb(to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
      )
    FROM latest_device ld
    WHERE ud.id = ld.id
    RETURNING ud.id INTO v_device_id;
  END IF;

  IF v_device_id IS NULL THEN
    RAISE EXCEPTION 'No pending device connection found';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'provider', v_provider,
    'status', v_status,
    'device_id', v_device_id
  );
END;
$$;