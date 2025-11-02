const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { logActivity } = require('../services/activityLog');

const router = express.Router();

// Get all invoices
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM invoices WHERE user_id = $1', [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get a single invoice with its items
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const invoiceRes = await db.query('SELECT * FROM invoices WHERE id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const itemsRes = await db.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
    const invoice = invoiceRes.rows[0];
    invoice.items = itemsRes.rows;
    res.json(invoice);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create a new invoice
router.post('/', authMiddleware, async (req, res) => {
  const { contact_id, invoice_number, status, issue_date, due_date, total, items } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const invoiceRes = await client.query(
      'INSERT INTO invoices (user_id, contact_id, invoice_number, status, issue_date, due_date, total) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [req.user.userId, contact_id, invoice_number, status, issue_date, due_date, total]
    );
    const invoice = invoiceRes.rows[0];
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES ($1, $2, $3, $4, $5)',
          [invoice.id, item.description, item.quantity, item.rate, item.amount]
        );
      }
    }
    await client.query('COMMIT');
    await logActivity(req.user.userId, 'INVOICE_CREATED', 'invoice', invoice.id);
    res.status(201).json(invoice);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Failed to create invoice' });
  } finally {
    client.release();
  }
});

// Update an invoice
router.put('/:id', authMiddleware, async (req, res) => {
  const { contact_id, invoice_number, status, issue_date, due_date, total, items } = req.body;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const invoiceRes = await client.query(
      'UPDATE invoices SET contact_id = $1, invoice_number = $2, status = $3, issue_date = $4, due_date = $5, total = $6 WHERE id = $7 AND user_id = $8 RETURNING *',
      [contact_id, invoice_number, status, issue_date, due_date, total, req.params.id, req.user.userId]
    );
    if (invoiceRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    const invoice = invoiceRes.rows[0];
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoice.id]);
    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES ($1, $2, $3, $4, $5)',
          [invoice.id, item.description, item.quantity, item.rate, item.amount]
        );
      }
    }
    await client.query('COMMIT');
    await logActivity(req.user.userId, 'INVOICE_UPDATED', 'invoice', invoice.id);
    res.json(invoice);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Failed to update invoice' });
  } finally {
    client.release();
  }
});

// Delete an invoice
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM invoices WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    await logActivity(req.user.userId, 'INVOICE_DELETED', 'invoice', req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

module.exports = router;
