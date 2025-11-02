const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const { initializeDatabase } = require('./db');
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const dealRoutes = require('./routes/deals');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const invoiceRoutes = require('./routes/invoices');
const timeEntryRoutes = require('./routes/time-entries');
const expenseRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

const startServer = async () => {
  await initializeDatabase();
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

startServer();
