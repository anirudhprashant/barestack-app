const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../services/activityLog');

const router = express.Router();

// Get all projects
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM projects WHERE user_id = $1', [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get a single project
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create a new project
router.post('/', authMiddleware, async (req, res) => {
  const { contact_id, name, status, budget } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO projects (user_id, contact_id, name, status, budget) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.userId, contact_id, name, status, budget]
    );
    const newProject = result.rows[0];
    await logActivity(req.user.userId, 'PROJECT_CREATED', 'project', newProject.id);
    res.status(201).json(newProject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update a project
router.put('/:id', authMiddleware, async (req, res) => {
  const { contact_id, name, status, budget } = req.body;
  try {
    const result = await db.query(
      'UPDATE projects SET contact_id = $1, name = $2, status = $3, budget = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [contact_id, name, status, budget, req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const updatedProject = result.rows[0];
    await logActivity(req.user.userId, 'PROJECT_UPDATED', 'project', updatedProject.id);
    res.json(updatedProject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete a project
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    await logActivity(req.user.userId, 'PROJECT_DELETED', 'project', req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
