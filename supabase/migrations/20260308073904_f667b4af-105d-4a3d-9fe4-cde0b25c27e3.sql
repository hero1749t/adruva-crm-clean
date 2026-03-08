
-- Fix overly permissive INSERT policy on profiles
DROP POLICY "Owners and admins can insert profiles" ON public.profiles;
CREATE POLICY "Owners and admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('owner', 'admin')
    OR auth.uid() = id
  );

-- Fix overly permissive INSERT policy on lead_activities
DROP POLICY "Authenticated users can insert activities" ON public.lead_activities;
CREATE POLICY "Authenticated users can insert activities"
  ON public.lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Fix overly permissive INSERT policy on activity_logs
DROP POLICY "Authenticated users can insert logs" ON public.activity_logs;
CREATE POLICY "Authenticated users can insert logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
