/*
  # Fix Vital Webhook Handler

  1. Changes
    - Fix SQL syntax for webhook handler function
    - Improve device connection status updates
    - Add better error handling
*/

-- Update webhook handler function
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

  -- First try to update with device email match
  UPDATE user_devices
  SET 
    status = v_status,
    last_sync_at = CASE 
      WHEN v_status = 'active' THEN now()
      ELSE last_sync_at
    END,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{connection_completed}',
      to_jsonb(now())
    )
  WHERE user_id = v_user_id
    AND provider = v_provider
    AND device_email = v_device_email
    AND status = 'pending'
  RETURNING id INTO v_device_id;

  -- If no rows updated with email match, try without email
  IF v_device_id IS NULL THEN
    WITH latest_device AS (
      SELECT id
      FROM user_devices
      WHERE user_id = v_user_id
        AND provider = v_provider
        AND status = 'pending'
      ORDER BY created_at DESC
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
        to_jsonb(now())
      )
    FROM latest_device ld
    WHERE ud.id = ld.id
    RETURNING ud.id INTO v_device_id;
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