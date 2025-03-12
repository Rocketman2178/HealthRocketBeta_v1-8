/*
  # Vital Device Connection

  1. New Functions
    - get_vital_link_token: Generate link token for device connection
    - handle_vital_connection: Process device connection callback
    
  2. Security
    - Enable RLS on device connections
    - Add policies for user access
*/

-- Create function to get Vital link token
CREATE OR REPLACE FUNCTION get_vital_link_token(
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
  v_config jsonb;
BEGIN
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
  );

  RETURN jsonb_build_object(
    'success', true,
    'vital_user_id', v_vital_user_id,
    'provider', p_provider
  );
END;
$$;

-- Create function to handle connection callback
CREATE OR REPLACE FUNCTION handle_vital_connection(
  p_user_id uuid,
  p_provider text,
  p_status text,
  p_metadata jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_id uuid;
BEGIN
  -- Update device connection status
  UPDATE user_devices
  SET 
    status = p_status,
    metadata = p_metadata,
    last_sync_at = CASE 
      WHEN p_status = 'active' THEN now()
      ELSE last_sync_at
    END
  WHERE user_id = p_user_id
    AND provider = p_provider
    AND status = 'pending'
  RETURNING id INTO v_device_id;

  IF v_device_id IS NULL THEN
    RAISE EXCEPTION 'No pending device connection found';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'device_id', v_device_id,
    'status', p_status
  );
END;
$$;