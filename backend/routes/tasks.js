const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../services/activityLog');

const router = express.Router();

// Get all tasks
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { project_id } = req.query;
    let result;
    if (project_id) {
      result = await db.query('SELECT * FROM tasks WHERE project_id = $1', [project_id]);
    } else {
      result = await db.query('SELECT tasks.* FROM tasks JOIN projects ON tasks.project_id = projects.id WHERE projects.user_id = $1', [req.user.userId]);
    }
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get a single task
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT tasks.* FROM tasks JOIN projects ON tasks.project_id = projects.id WHERE tasks.id = $1 AND projects.user_id = $2', [req.params.id, req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create a new task
router.post('/', authMiddleware, async (req, res) => {
  const { project_id, title, status, due_date, estimated_hours } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO tasks (project_id, title, status, due_date, estimated_hours) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [project_id, title, status, due_date, estimated_hours]
    );
    const newTask = result.rows[0];
    await logActivity(req.user.userId, 'TASK_CREATED', 'task', newTask.id);
    res.status(201).json(newTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
router.put('/:id', authMiddleware, async (req, res) => {
  const { project_id, title, status, due_date, estimated_hours } = req.body;
  try {
    const result = await db.query(
      'UPDATE tasks SET project_id = $1, title = $2, status = $3, due_date = $4, estimated_hours = $5 WHERE id = $6 RETURNING *',
      [project_id, title, status, due_date, estimated_hours, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const updatedTask = result.rows[0];
    await logActivity(req.user.userId, 'TASK_UPDATED', 'task', updatedTask.id);
    res.json(updatedTask);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    await logActivity(req.user.userId, 'TASK_DELETED', 'task', req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
