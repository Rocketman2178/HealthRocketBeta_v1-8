/*
  # Fix Device Connection Policies

  1. Changes
    - Add insert policy for device connections
    - Add better error handling for device connections
    - Fix RLS policies for user_devices table
*/

-- Drop existing policies
DROP POLICY IF EXISTS "users_insert_own_devices" ON public.user_devices;

-- Create new insert policy with proper checks
CREATE POLICY "users_insert_own_devices" 
  ON public.user_devices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = user_id 
      AND u.vital_user_id = vital_user_id
    )
  );

-- Create function to validate device connection
CREATE OR REPLACE FUNCTION validate_device_connection(
  p_user_id uuid,
  p_provider text
) 
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user exists and has vital_user_id
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = p_user_id 
    AND vital_user_id IS NOT NULL
  ) THEN
    RETURN false;
  END IF;

  -- Validate provider
  IF p_provider NOT IN ('oura', 'fitbit', 'apple', 'garmin') THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;