/*
  # Add Vital Setup Fields

  1. New Fields
    - Add vital_profile table to store user health data
    - Add fields for height, weight, birthdate
    - Add fields for activity level and health goals
    
  2. Security
    - Enable RLS
    - Add policies for user access
*/

-- Create vital_profile table
CREATE TABLE IF NOT EXISTS public.vital_profile (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  height_cm numeric(5,2),
  weight_kg numeric(5,2),
  birthdate date,
  activity_level text,
  health_goals jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_activity_level CHECK (
    activity_level IN ('sedentary', 'light', 'moderate', 'very_active', 'extra_active')
  )
);

-- Enable RLS
ALTER TABLE public.vital_profile ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile"
  ON public.vital_profile
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.vital_profile
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.vital_profile
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to update vital profile
CREATE OR REPLACE FUNCTION update_vital_profile(
  p_user_id uuid,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_birthdate date,
  p_activity_level text,
  p_health_goals jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate activity level
  IF p_activity_level NOT IN ('sedentary', 'light', 'moderate', 'very_active', 'extra_active') THEN
    RAISE EXCEPTION 'Invalid activity level';
  END IF;

  -- Insert or update profile
  INSERT INTO vital_profile (
    user_id,
    height_cm,
    weight_kg,
    birthdate,
    activity_level,
    health_goals,
    updated_at
  ) VALUES (
    p_user_id,
    p_height_cm,
    p_weight_kg,
    p_birthdate,
    p_activity_level,
    p_health_goals,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    height_cm = EXCLUDED.height_cm,
    weight_kg = EXCLUDED.weight_kg,
    birthdate = EXCLUDED.birthdate,
    activity_level = EXCLUDED.activity_level,
    health_goals = EXCLUDED.health_goals,
    updated_at = EXCLUDED.updated_at;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id
  );
END;
$$;