const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../services/activityLog');

const router = express.Router();

// Get all deals
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM deals WHERE user_id = $1', [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Get a single deal
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM deals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// Create a new deal
router.post('/', authMiddleware, async (req, res) => {
  const { contact_id, title, value, stage } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO deals (user_id, contact_id, title, value, stage) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.userId, contact_id, title, value, stage]
    );
    const newDeal = result.rows[0];
    await logActivity(req.user.userId, 'DEAL_CREATED', 'deal', newDeal.id);
    res.status(201).json(newDeal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// Update a deal
router.put('/:id', authMiddleware, async (req, res) => {
  const { contact_id, title, value, stage } = req.body;
  try {
    const result = await db.query(
      'UPDATE deals SET contact_id = $1, title = $2, value = $3, stage = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [contact_id, title, value, stage, req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    const updatedDeal = result.rows[0];
    await logActivity(req.user.userId, 'DEAL_UPDATED', 'deal', updatedDeal.id);
    res.json(updatedDeal);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// Delete a deal
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM deals WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    await logActivity(req.user.userId, 'DEAL_DELETED', 'deal', req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

module.exports = router;
