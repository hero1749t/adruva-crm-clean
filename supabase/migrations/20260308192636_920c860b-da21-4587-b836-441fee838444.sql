
-- Invoice status enum
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  due_date DATE NOT NULL,
  paid_date DATE,
  billing_period_start DATE,
  billing_period_end DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_invoices_client ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_due_date ON public.invoices(due_date);

-- Auto-update updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.invoices;
  NEW.invoice_number := 'INV-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION public.generate_invoice_number();

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices based on role"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    (get_user_role(auth.uid()) IN ('owner', 'admin'))
    OR (client_id IN (SELECT id FROM public.clients WHERE assigned_manager = auth.uid()))
  );

CREATE POLICY "Owner and Admin can insert invoices"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "Owner and Admin can update invoices"
  ON public.invoices FOR UPDATE TO authenticated
  USING (get_user_role(auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "Owner can delete invoices"
  ON public.invoices FOR DELETE TO authenticated
  USING (get_user_role(auth.uid()) = 'owner');
