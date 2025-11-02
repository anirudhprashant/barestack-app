const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authMiddleware, async (req, res) => {
  const { userId } = req.user;

  try {
    const contactsQuery = db.query('SELECT COUNT(*) FROM contacts WHERE user_id = $1', [userId]);
    const projectsQuery = db.query("SELECT COUNT(*) FROM projects WHERE user_id = $1 AND status = 'active'", [userId]);
    const invoicesQuery = db.query("SELECT SUM(total) FROM invoices WHERE user_id = $1 AND status != 'paid'", [userId]);
    const hoursQuery = db.query("SELECT SUM(hours) FROM time_entries WHERE user_id = $1 AND date >= date_trunc('week', CURRENT_DATE)", [userId]);
    const tasksQuery = db.query("SELECT COUNT(*) FROM tasks JOIN projects ON tasks.project_id = projects.id WHERE projects.user_id = $1 AND tasks.status != 'done'", [userId]);

    const [
      contactsResult,
      projectsResult,
      invoicesResult,
      hoursResult,
      tasksResult,
    ] = await Promise.all([
      contactsQuery,
      projectsQuery,
      invoicesQuery,
      hoursQuery,
      tasksQuery,
    ]);

    res.json({
      totalContacts: parseInt(contactsResult.rows[0].count, 10),
      activeProjects: parseInt(projectsResult.rows[0].count, 10),
      unpaidInvoices: parseFloat(invoicesResult.rows[0].sum) || 0,
      hoursThisWeek: parseFloat(hoursResult.rows[0].sum) || 0,
      activeTasks: parseInt(tasksResult.rows[0].count, 10),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM activity_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

module.exports = router;
