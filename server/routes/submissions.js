const router    = require('express').Router();
const pool      = require('../db/pool');
const { executeWithHarness } = require('../executors/python');
const rateLimit = require('express-rate-limit');

const execLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.body?.session_id || req.ip,
  message: { error: 'Too many submissions — wait a minute' },
  standardHeaders: true, legacyHeaders: false,
});

// POST /api/submissions
router.post('/', execLimit, async (req, res) => {
  const { session_id, display_name = 'Anonymous', question_id, code, helper_code, test_code } = req.body;
  if (!session_id || !question_id || !code) {
    return res.status(400).json({ error: 'session_id, question_id and code are required' });
  }

  // Verify question exists
  const { rows: qRows } = await pool.query('SELECT id FROM questions WHERE id = $1', [question_id]);
  if (!qRows[0]) return res.status(404).json({ error: 'Unknown question' });

  // Run code
  const exec = await executeWithHarness(code, helper_code || '', test_code || '');

  const passed = !exec.error && !exec.timedOut && exec.passCount === exec.total && exec.total > 0;
  const score  = exec.passCount || 0;
  const total  = exec.total     || 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: subRows } = await client.query(
      `INSERT INTO submissions (session_id, display_name, question_id, code, passed, score, total, stdout, stderr)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, created_at`,
      [session_id, display_name, question_id, code, passed, score, total,
       exec.stdout?.slice(0, 4096) || '', exec.stderr?.slice(0, 4096) || '']
    );

    await client.query(
      `INSERT INTO progress (session_id, display_name, question_id, completed, best_score, total, attempts)
       VALUES ($1,$2,$3,$4,$5,$6,1)
       ON CONFLICT (session_id, question_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         completed    = GREATEST(progress.completed::int, EXCLUDED.completed::int)::boolean,
         best_score   = GREATEST(progress.best_score, EXCLUDED.best_score),
         total        = EXCLUDED.total,
         attempts     = progress.attempts + 1,
         updated_at   = NOW()`,
      [session_id, display_name, question_id, passed, score, total]
    );

    await client.query('COMMIT');

    res.json({
      submission_id: subRows[0].id,
      passed, score, total,
      results:  exec.results,
      stdout:   exec.stdout,
      stderr:   exec.stderr,
      timedOut: exec.timedOut,
      error:    exec.error,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to save submission' });
  } finally {
    client.release();
  }
});

// GET /api/submissions?session_id=xxx&question_id=yyy
router.get('/', async (req, res) => {
  const { session_id, question_id, limit = 10 } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id required' });
  try {
    const { rows } = await pool.query(
      `SELECT id, question_id, passed, score, total, created_at
       FROM submissions
       WHERE session_id = $1 ${question_id ? 'AND question_id = $2' : ''}
       ORDER BY created_at DESC LIMIT ${question_id ? '$3' : '$2'}`,
      question_id
        ? [session_id, question_id, Math.min(Number(limit), 50)]
        : [session_id, Math.min(Number(limit), 50)]
    );
    res.json({ submissions: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

module.exports = router;
