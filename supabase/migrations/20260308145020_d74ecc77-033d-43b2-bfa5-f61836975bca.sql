
-- Update tasks SELECT policy to include task_manager role (can see assigned tasks)
DROP POLICY IF EXISTS "Users can view tasks based on role" ON public.tasks;
CREATE POLICY "Users can view tasks based on role" ON public.tasks
FOR SELECT TO authenticated
USING (
  (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'admin'::user_role]))
  OR (assigned_to = auth.uid())
);

-- Update tasks UPDATE policy to include task_manager (can update assigned tasks)
DROP POLICY IF EXISTS "Users can update tasks based on role" ON public.tasks;
CREATE POLICY "Users can update tasks based on role" ON public.tasks
FOR UPDATE TO authenticated
USING (
  (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'admin'::user_role]))
  OR (assigned_to = auth.uid())
);

-- Update leads SELECT policy - task_manager can see assigned leads
DROP POLICY IF EXISTS "Users can view leads based on role" ON public.leads;
CREATE POLICY "Users can view leads based on role" ON public.leads
FOR SELECT TO authenticated
USING (
  (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'admin'::user_role]))
  OR (assigned_to = auth.uid())
);

-- Update leads UPDATE policy - task_manager can update assigned leads
DROP POLICY IF EXISTS "Owner and Admin can update leads" ON public.leads;
CREATE POLICY "Users can update leads based on role" ON public.leads
FOR UPDATE TO authenticated
USING (
  (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'admin'::user_role]))
  OR (assigned_to = auth.uid())
);

-- Update clients SELECT policy - task_manager can see assigned clients
DROP POLICY IF EXISTS "Users can view clients based on role" ON public.clients;
CREATE POLICY "Users can view clients based on role" ON public.clients
FOR SELECT TO authenticated
USING (
  (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'admin'::user_role]))
  OR (assigned_manager = auth.uid())
);
