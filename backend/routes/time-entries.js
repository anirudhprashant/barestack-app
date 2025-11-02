const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../services/activityLog');

const router = express.Router();

// Get all time entries
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { project_id } = req.query;
    let result;
    if (project_id) {
      result = await db.query('SELECT * FROM time_entries WHERE project_id = $1 AND user_id = $2', [project_id, req.user.userId]);
    } else {
      result = await db.query('SELECT * FROM time_entries WHERE user_id = $1', [req.user.userId]);
    }
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// Get a single time entry
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM time_entries WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch time entry' });
  }
});

// Create a new time entry
router.post('/', authMiddleware, async (req, res) => {
  const { project_id, task_id, description, hours, date, is_billable } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO time_entries (user_id, project_id, task_id, description, hours, date, is_billable) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.userId, project_id, task_id, description, hours, date, is_billable]
    );
    const newTimeEntry = result.rows[0];
    await logActivity(req.user.userId, 'TIME_ENTRY_CREATED', 'time_entry', newTimeEntry.id);
    res.status(201).json(newTimeEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create time entry' });
  }
});

// Update a time entry
router.put('/:id', authMiddleware, async (req, res) => {
  const { project_id, task_id, description, hours, date, is_billable } = req.body;
  try {
    const result = await db.query(
      'UPDATE time_entries SET project_id = $1, task_id = $2, description = $3, hours = $4, date = $5, is_billable = $6 WHERE id = $7 AND user_id = $8 RETURNING *',
      [project_id, task_id, description, hours, date, is_billable, req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    const updatedTimeEntry = result.rows[0];
    await logActivity(req.user.userId, 'TIME_ENTRY_UPDATED', 'time_entry', updatedTimeEntry.id);
    res.json(updatedTimeEntry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update time entry' });
  }
});

// Delete a time entry
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM time_entries WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    await logActivity(req.user.userId, 'TIME_ENTRY_DELETED', 'time_entry', req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

module.exports = router;
