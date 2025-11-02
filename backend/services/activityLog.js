const db = require('../db');

const logActivity = async (userId, action, entityType, entityId) => {
  try {
    await db.query(
      'INSERT INTO activity_log (user_id, action, entity_type, entity_id) VALUES ($1, $2, $3, $4)',
      [userId, action, entityType, entityId]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

module.exports = { logActivity };
