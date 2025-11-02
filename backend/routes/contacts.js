const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../services/activityLog');

const router = express.Router();

// --- Get all contacts for the logged-in user ---
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM contacts WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching contacts.' });
  }
});

// --- Get a single contact by ID ---
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM contacts WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the contact.' });
  }
});

// --- Create a new contact ---
router.post('/', authMiddleware, async (req, res) => {
  const { fullName, email, phone, company, notes, tags } = req.body;

  if (!fullName) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  try {
    const result = await db.query(
      'INSERT INTO contacts (user_id, full_name, email, phone, company, notes, tags) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.userId, fullName, email, phone, company, notes, tags]
    );
    const newContact = result.rows[0];
    await logActivity(req.user.userId, 'CONTACT_CREATED', 'contact', newContact.id);
    res.status(201).json(newContact);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while creating the contact.' });
  }
});

// --- Update an existing contact ---
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { fullName, email, phone, company, notes, tags } = req.body;

  if (!fullName) {
    return res.status(400).json({ error: 'Full name is required.' });
  }

  try {
    const result = await db.query(
      'UPDATE contacts SET full_name = $1, email = $2, phone = $3, company = $4, notes = $5, tags = $6 WHERE id = $7 AND user_id = $8 RETURNING *',
      [fullName, email, phone, company, notes, tags, id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found.' });
    }
    const updatedContact = result.rows[0];
    await logActivity(req.user.userId, 'CONTACT_UPDATED', 'contact', updatedContact.id);
    res.json(updatedContact);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while updating the contact.' });
  }
});

// --- Delete a contact ---
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'DELETE FROM contacts WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found.' });
    }
    await logActivity(req.user.userId, 'CONTACT_DELETED', 'contact', id);
    res.status(204).send(); // No Content
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while deleting the contact.' });
  }
});

module.exports = router;
