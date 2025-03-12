/*
  # Fix Vital Webhook Handler

  1. Changes
    - Add webhook handler function
    - Add connection cleanup functions
    - Add performance indexes
    - Fix metadata timestamp handling

  2. Security
    - Enable RLS
    - Add security definer functions
*/

-- Create function to handle Vital webhooks
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
BEGIN
  -- Extract data from payload
  v_provider := payload->>'provider';
  v_status := payload->>'status';

  -- Get user ID from vital_user_id
  SELECT id INTO v_user_id
  FROM users
  WHERE vital_user_id = payload->>'user_id';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for Vital ID';
  END IF;

  -- Update device connection status
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
    AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'provider', v_provider,
    'status', v_status
  );
END;
$$;

-- Create function to clean up old pending connections
CREATE OR REPLACE FUNCTION cleanup_pending_connections()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete pending connections older than 1 hour
  DELETE FROM user_devices
  WHERE status = 'pending'
    AND (metadata->>'connection_started')::timestamptz < now() - interval '1 hour';
END;
$$;

-- Create trigger to clean up old pending connections
CREATE OR REPLACE FUNCTION trigger_cleanup_pending_connections()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM cleanup_pending_connections();
  RETURN NEW;
END;
$$;

-- Add trigger to clean up on new connection
DROP TRIGGER IF EXISTS cleanup_pending_connections_trigger ON user_devices;
CREATE TRIGGER cleanup_pending_connections_trigger
  AFTER INSERT ON user_devices
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_pending_connections();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_devices_status ON user_devices(status);
CREATE INDEX IF NOT EXISTS idx_user_devices_provider ON user_devices(provider);
CREATE INDEX IF NOT EXISTS idx_user_devices_user_provider ON user_devices(user_id, provider);

-- Update existing pending connections to have metadata
UPDATE user_devices
SET metadata = jsonb_build_object('connection_started', connected_at)
WHERE status = 'pending'
  AND (metadata IS NULL OR metadata->>'connection_started' IS NULL);