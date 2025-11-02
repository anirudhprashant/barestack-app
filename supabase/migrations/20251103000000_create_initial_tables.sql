-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    notes TEXT,
    tags TEXT[]
);

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id),
    value NUMERIC,
    stage TEXT,
    last_interaction TIMESTAMPTZ
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    client_id UUID REFERENCES contacts(id),
    status TEXT,
    budget NUMERIC,
    estimated_hours NUMERIC
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    title TEXT NOT NULL,
    assigned_to UUID,
    due_date TIMESTAMPTZ,
    estimated_hours NUMERIC,
    status TEXT
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT,
    client_id UUID REFERENCES contacts(id),
    issue_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    tax_rate NUMERIC,
    status TEXT,
    paid_date TIMESTAMPTZ,
    payment_method TEXT
);

-- Add total_amount column to invoices table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   information_schema.columns
        WHERE  table_name = 'invoices'
        AND    column_name = 'total_amount'
    ) THEN
        ALTER TABLE invoices ADD COLUMN total_amount NUMERIC;
    END IF;
END;
$$;


-- Create line_items table
CREATE TABLE IF NOT EXISTS line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id),
    description TEXT,
    quantity NUMERIC,
    rate NUMERIC
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    task_id UUID REFERENCES tasks(id),
    date TIMESTAMPTZ,
    hours NUMERIC,
    description TEXT,
    is_billable BOOLEAN
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TIMESTAMPTZ,
    category TEXT,
    amount NUMERIC,
    description TEXT,
    project_id UUID REFERENCES projects(id),
    receipt_url TEXT
);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT,
    entity_type TEXT,
    entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);