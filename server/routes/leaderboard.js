const router = require('express').Router();
const pool   = require('../db/pool');

// GET /api/leaderboard?limit=25
router.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  try {
    const { rows } = await pool.query(
      `SELECT
         ROW_NUMBER() OVER (ORDER BY solved DESC, total_score DESC, last_active ASC) AS rank,
         session_id, display_name, solved, total_score, total_attempts, last_active
       FROM leaderboard LIMIT $1`,
      [limit]
    );
    res.json({ leaderboard: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
