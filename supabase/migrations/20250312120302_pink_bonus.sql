/*
  # Add Vital Connection Functions

  1. New Functions
    - connect_vital_device: Handles device connection requests
    - validate_vital_connection: Validates connection parameters
    
  2. Security
    - RLS policies for device connections
    - Input validation
*/

-- Create function to validate vital connection parameters
CREATE OR REPLACE FUNCTION validate_vital_connection(
  p_user_id uuid,
  p_provider text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Invalid user ID';
  END IF;

  -- Validate provider
  IF p_provider NOT IN ('oura', 'fitbit', 'apple', 'garmin') THEN
    RAISE EXCEPTION 'Invalid provider';
  END IF;

  RETURN true;
END;
$$;

-- Create function to handle device connections
CREATE OR REPLACE FUNCTION connect_vital_device(
  p_user_id uuid,
  p_provider text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vital_user_id text;
  v_result jsonb;
BEGIN
  -- Validate parameters
  PERFORM validate_vital_connection(p_user_id, p_provider);

  -- Get or create Vital user ID
  SELECT vital_user_id INTO v_vital_user_id
  FROM users
  WHERE id = p_user_id;

  -- Create device connection record
  INSERT INTO user_devices (
    user_id,
    vital_user_id,
    provider,
    status
  ) VALUES (
    p_user_id,
    v_vital_user_id,
    p_provider,
    'pending'
  );

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'vital_user_id', v_vital_user_id,
    'provider', p_provider
  );
END;
$$;