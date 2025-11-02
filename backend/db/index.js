const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createTablesSQL = `
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id),
    title VARCHAR(255) NOT NULL,
    value DECIMAL(12,2),
    stage VARCHAR(50) DEFAULT 'lead',
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    budget DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'todo',
    due_date DATE,
    estimated_hours INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    rate DECIMAL(12,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL
  );

  CREATE TABLE time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id),
    description TEXT,
    hours DECIMAL(5,2) NOT NULL,
    date DATE NOT NULL,
    is_billable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id),
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX idx_contacts_user ON contacts(user_id);
  CREATE INDEX idx_projects_user ON projects(user_id);
  CREATE INDEX idx_invoices_user ON invoices(user_id);
  CREATE INDEX idx_time_entries_user ON time_entries(user_id);
`;

const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT to_regclass('public.users');");
    if (res.rows[0].to_regclass === null) {
      console.log('Tables not found, creating them...');
      await client.query(createTablesSQL);
      console.log('Tables and indexes created successfully.');
    }
  } finally {
    client.release();
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initializeDatabase,
};
