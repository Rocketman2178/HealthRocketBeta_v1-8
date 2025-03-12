/*
  # Add User Devices RLS Policies

  1. Changes
    - Add INSERT policy for user_devices table
    - Add UPDATE policy for user_devices table
    - Add DELETE policy for user_devices table

  2. Security
    - Users can only manage their own device connections
    - Requires authentication
*/

-- Enable RLS if not already enabled
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_view_own_devices" ON public.user_devices;
DROP POLICY IF EXISTS "users_insert_own_devices" ON public.user_devices;
DROP POLICY IF EXISTS "users_update_own_devices" ON public.user_devices;
DROP POLICY IF EXISTS "users_delete_own_devices" ON public.user_devices;

-- Create comprehensive RLS policies
CREATE POLICY "users_view_own_devices" 
  ON public.user_devices
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_devices" 
  ON public.user_devices
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_devices" 
  ON public.user_devices
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_devices" 
  ON public.user_devices
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);