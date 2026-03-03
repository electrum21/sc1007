const router = require('express').Router();
const pool   = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const { rows } = await pool.query(
      `SELECT ROW_NUMBER() OVER (ORDER BY solved DESC, total_score DESC, last_active ASC) AS rank,
              session_id, display_name, solved, total_score, total_attempts, last_active
       FROM leaderboard LIMIT $1`,
      [limit]
    );
    res.json({ leaderboard: rows });
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
