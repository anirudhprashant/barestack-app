const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../services/activityLog');

const router = express.Router();

// Get all expenses
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { project_id } = req.query;
    let result;
    if (project_id) {
      result = await db.query('SELECT * FROM expenses WHERE project_id = $1 AND user_id = $2', [project_id, req.user.userId]);
    } else {
      result = await db.query('SELECT * FROM expenses WHERE user_id = $1', [req.user.userId]);
    }
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Get a single expense
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

// Create a new expense
router.post('/', authMiddleware, async (req, res) => {
  const { project_id, category, amount, date, description } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO expenses (user_id, project_id, category, amount, date, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.user.userId, project_id, category, amount, date, description]
    );
    const newExpense = result.rows[0];
    await logActivity(req.user.userId, 'EXPENSE_CREATED', 'expense', newExpense.id);
    res.status(201).json(newExpense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Update an expense
router.put('/:id', authMiddleware, async (req, res) => {
  const { project_id, category, amount, date, description } = req.body;
  try {
    const result = await db.query(
      'UPDATE expenses SET project_id = $1, category = $2, amount = $3, date = $4, description = $5 WHERE id = $6 AND user_id = $7 RETURNING *',
      [project_id, category, amount, date, description, req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    const updatedExpense = result.rows[0];
    await logActivity(req.user.userId, 'EXPENSE_UPDATED', 'expense', updatedExpense.id);
    res.json(updatedExpense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete an expense
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    await logActivity(req.user.userId, 'EXPENSE_DELETED', 'expense', req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;
