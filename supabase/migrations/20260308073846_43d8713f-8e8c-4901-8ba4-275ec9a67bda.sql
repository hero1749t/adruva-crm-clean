
-- ── ENUMS ───────────────────────────────────────────────────────────────
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'team');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive');
CREATE TYPE public.lead_status AS ENUM ('new_lead', 'audit_booked', 'audit_done', 'in_progress', 'lead_won', 'lead_lost');
CREATE TYPE public.client_status AS ENUM ('active', 'paused', 'completed');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
CREATE TYPE public.task_priority AS ENUM ('urgent', 'high', 'medium', 'low');
CREATE TYPE public.billing_status AS ENUM ('due', 'paid', 'overdue');

-- ── PROFILES (extends auth.users) ────────────────────────────────────
CREATE TABLE public.profiles (
  id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  role             public.user_role   NOT NULL DEFAULT 'team',
  status           public.user_status NOT NULL DEFAULT 'active',
  login_attempts   int         DEFAULT 0,
  locked_until     timestamptz,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all active profiles (needed for dropdowns)
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Profiles: users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Profiles: only owners can insert (create users)
CREATE POLICY "Owners and admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Max 2 owners constraint
CREATE OR REPLACE FUNCTION public.check_owner_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'owner' AND NEW.status = 'active' THEN
    IF (SELECT COUNT(*) FROM public.profiles WHERE role = 'owner' AND status = 'active' AND id != NEW.id) >= 2 THEN
      RAISE EXCEPTION 'MAX_OWNERS_REACHED';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER enforce_owner_limit
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_owner_limit();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'team'),
    'active'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── LEADS ────────────────────────────────────────────────────────────────
CREATE TABLE public.leads (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  company_name     text,
  phone            text        NOT NULL,
  email            text        UNIQUE NOT NULL,
  source           text,
  service_interest text,
  assigned_to      uuid        REFERENCES public.profiles(id),
  status           public.lead_status NOT NULL DEFAULT 'new_lead',
  notes            text,
  is_deleted       boolean     DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned ON public.leads(assigned_to);
CREATE INDEX idx_leads_not_deleted ON public.leads(is_deleted);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Role-checking security definer function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id LIMIT 1;
$$;

-- Leads: Owner/Admin see all, Team sees assigned only
CREATE POLICY "Users can view leads based on role"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'admin')
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Owner and Admin can insert leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "Owner and Admin can update leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'admin')
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Only Owner can delete leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'owner'
  );

-- ── LEAD ACTIVITIES ──────────────────────────────────────────────────────
CREATE TABLE public.lead_activities (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type         text        NOT NULL,
  content      text        NOT NULL,
  metadata     jsonb,
  created_by   uuid        REFERENCES public.profiles(id),
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_activities_lead ON public.lead_activities(lead_id);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead activities"
  ON public.lead_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activities"
  ON public.lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── CLIENTS ──────────────────────────────────────────────────────────────
CREATE TABLE public.clients (
  id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             uuid           UNIQUE REFERENCES public.leads(id),
  client_name         text           NOT NULL,
  company_name        text,
  phone               text,
  email               text           UNIQUE NOT NULL,
  plan                text,
  monthly_payment     numeric(12,2),
  start_date          date,
  contract_end_date   date,
  billing_status      public.billing_status DEFAULT 'due',
  assigned_manager    uuid           REFERENCES public.profiles(id),
  status              public.client_status DEFAULT 'active',
  created_at          timestamptz    DEFAULT now(),
  updated_at          timestamptz    DEFAULT now()
);

CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_manager ON public.clients(assigned_manager);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clients based on role"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'admin')
    OR assigned_manager = auth.uid()
  );

CREATE POLICY "Owner and Admin can update clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "System can insert clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('owner', 'admin')
  );

-- ── TASKS ────────────────────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid          NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  task_title    text          NOT NULL,
  website_link  text,
  gmb_link      text,
  meta_link     text,
  start_date    date,
  deadline      timestamptz   NOT NULL,
  priority      public.task_priority DEFAULT 'medium',
  assigned_to   uuid          REFERENCES public.profiles(id),
  status        public.task_status DEFAULT 'pending',
  notes         text,
  completed_at  timestamptz,
  created_at    timestamptz   DEFAULT now(),
  updated_at    timestamptz   DEFAULT now()
);

CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_deadline ON public.tasks(deadline);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_client ON public.tasks(client_id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks based on role"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'admin')
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Owner and Admin can insert tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "Users can update tasks based on role"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'admin')
    OR assigned_to = auth.uid()
  );

CREATE POLICY "Owner and Admin can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'admin')
  );

-- ── TASK TEMPLATES ───────────────────────────────────────────────────────
CREATE TABLE public.task_templates (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  title                 text          NOT NULL,
  priority              public.task_priority DEFAULT 'medium',
  deadline_offset_days  int           DEFAULT 7,
  sort_order            int           DEFAULT 0,
  is_active             boolean       DEFAULT true
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON public.task_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can manage templates"
  ON public.task_templates FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'owner');

-- Seed default task templates
INSERT INTO public.task_templates (title, priority, deadline_offset_days, sort_order) VALUES
  ('Initial Website Audit',         'high',   3,  1),
  ('GMB Profile Setup & Optimise',  'high',   5,  2),
  ('Meta Business Manager Setup',   'medium', 5,  3),
  ('Keyword Research',              'high',   7,  4),
  ('On-Page SEO Implementation',    'medium', 14, 5),
  ('Monthly Report — Month 1',     'medium', 30, 6);

-- ── ACTIVITY LOGS ────────────────────────────────────────────────────────
CREATE TABLE public.activity_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES public.profiles(id),
  action      text        NOT NULL,
  entity      text        NOT NULL,
  entity_id   uuid        NOT NULL,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_logs_entity ON public.activity_logs(entity, entity_id);
CREATE INDEX idx_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_logs_created ON public.activity_logs(created_at);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner and Admin can view logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "Authenticated users can insert logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── LEAD WON AUTOMATION ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_lead_won()
RETURNS TRIGGER AS $$
DECLARE
  new_client_id uuid;
  template      RECORD;
BEGIN
  IF NEW.status = 'lead_won' AND OLD.status != 'lead_won' THEN
    -- Create client from lead
    INSERT INTO public.clients (lead_id, client_name, company_name, phone, email,
                                assigned_manager, status, billing_status, start_date)
    VALUES (NEW.id, NEW.name, NEW.company_name, NEW.phone, NEW.email,
            NEW.assigned_to, 'active', 'due', CURRENT_DATE)
    RETURNING id INTO new_client_id;

    -- Create default tasks from templates
    FOR template IN SELECT * FROM public.task_templates WHERE is_active = true ORDER BY sort_order LOOP
      INSERT INTO public.tasks (client_id, task_title, priority, deadline, assigned_to, status)
      VALUES (
        new_client_id,
        template.title,
        template.priority,
        now() + (template.deadline_offset_days || ' days')::interval,
        NEW.assigned_to,
        'pending'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_lead_won
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_lead_won();
