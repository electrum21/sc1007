require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const pool        = require('./db/pool');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '256kb' }));

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests' },
}));

app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, '..', 'client')));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, '..', 'client', 'index.html')));

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Run migrations + seed inline before starting ──
async function initDB() {
  const client = await pool.connect();
  try {
    console.log('Running migrations…');
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY, tag TEXT NOT NULL,
        title TEXT NOT NULL, difficulty TEXT NOT NULL DEFAULT 'medium'
      );
      CREATE TABLE IF NOT EXISTS submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT NOT NULL, display_name TEXT NOT NULL DEFAULT 'Anonymous',
        question_id TEXT NOT NULL REFERENCES questions(id),
        code TEXT NOT NULL, passed BOOLEAN NOT NULL DEFAULT false,
        score INT NOT NULL DEFAULT 0, total INT NOT NULL DEFAULT 0,
        stdout TEXT, stderr TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT NOT NULL, display_name TEXT NOT NULL DEFAULT 'Anonymous',
        question_id TEXT NOT NULL REFERENCES questions(id),
        completed BOOLEAN NOT NULL DEFAULT false,
        best_score INT NOT NULL DEFAULT 0, total INT NOT NULL DEFAULT 0,
        attempts INT NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(session_id, question_id)
      );
      CREATE OR REPLACE VIEW leaderboard AS
        SELECT session_id, MAX(display_name) AS display_name,
          COUNT(DISTINCT question_id) FILTER (WHERE completed) AS solved,
          COALESCE(SUM(best_score),0) AS total_score,
          COALESCE(SUM(attempts),0) AS total_attempts,
          MAX(updated_at) AS last_active
        FROM progress GROUP BY session_id
        ORDER BY solved DESC, total_score DESC, last_active ASC;
      CREATE INDEX IF NOT EXISTS idx_sub_session  ON submissions(session_id);
      CREATE INDEX IF NOT EXISTS idx_sub_question ON submissions(question_id);
      CREATE INDEX IF NOT EXISTS idx_prog_session ON progress(session_id);
    `);
    console.log('✓ Migration complete');

    // Seed questions
    const QUESTIONS = [
      ['remove_duplicates_sorted_ll','Linked Lists','Remove Duplicates (Sorted)','easy'],
      ['insert_remove_node','Linked Lists','insertNode and removeNode','medium'],
      ['split_even_odd','Linked Lists','Split Even/Odd','medium'],
      ['duplicate_reverse','Linked Lists','Duplicate Reverse','medium'],
      ['find_union','Linked Lists','Find Union','medium'],
      ['move_even_to_back','Linked Lists','Move Even Items to Back','easy'],
      ['move_max_to_front','Linked Lists','Move Max to Front','easy'],
      ['move_min_node','Linked Lists','Move Min Node to Front','easy'],
      ['move_odd_to_back','Linked Lists','Move Odd Items to Back','easy'],
      ['reverse_between','Linked Lists','Reverse Between m and n','hard'],
      ['find_before_middle','Linked Lists','Find Node Before Middle','medium'],
      ['reverse_stack_queue','Stacks & Queues','Reverse Stack using Queue','easy'],
      ['reverse_queue_mn','Stacks & Queues','Reverse Queue m to n','medium'],
      ['middle_of_stack','Stacks & Queues','Middle of Stack','medium'],
      ['reverse_second_half','Stacks & Queues','Reverse Second Half of Queue','hard'],
      ['sort_stack','Stacks & Queues','Sort a Stack','medium'],
      ['count_leaf_nodes','Binary Trees','Count Leaf Nodes','easy'],
      ['count_nonleaf_nodes','Binary Trees','Count Non-Leaf Nodes','easy'],
      ['tree_height','Binary Trees','Tree Height','easy'],
      ['level_order','Binary Trees','Level Order Traversal','medium'],
      ['is_balanced','Binary Trees','Is Balanced','medium'],
      ['lowest_common_ancestor','Binary Trees','Lowest Common Ancestor','hard'],
      ['bst_insert','BST','BST Insert','easy'],
      ['bst_search','BST','BST Search','easy'],
      ['bst_delete','BST','BST Delete','hard'],
      ['bst_validate','BST','Validate BST','medium'],
      ['bst_kth_smallest','BST','Kth Smallest in BST','medium'],
      ['quiz_q1_reverse_queue','Stacks & Queues','Q1 Reverse Queue m..n','medium'],
      ['quiz_q2_count_leaf','Binary Trees','Q2 Count Leaf Nodes','easy'],
      ['quiz_q3_middle_stack','Stacks & Queues','Q3 Middle of Stack','medium'],
      ['quiz_q4_intersect','Linked Lists','Q4 Intersect Two LLs','hard'],
      ['quiz_q5_reverse_ll','Linked Lists','Q5 Reverse LL m..n','hard'],
      ['quiz_q6_count_nonleaf','Binary Trees','Q6 Count Non-Leaf','easy'],
      ['quiz_q7_reverse_half','Stacks & Queues','Q7 Reverse 2nd Half Queue','hard'],
      ['quiz_q8_before_middle','Linked Lists','Q8 Before-Middle of Stack','medium'],
    ];
    for (const [id, tag, title, difficulty] of QUESTIONS) {
      await client.query(
        `INSERT INTO questions (id,tag,title,difficulty) VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET tag=EXCLUDED.tag, title=EXCLUDED.title, difficulty=EXCLUDED.difficulty`,
        [id, tag, title, difficulty]
      );
    }
    console.log(`✓ Seeded ${QUESTIONS.length} questions`);
  } catch (err) {
    console.error('DB init failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

const PORT = process.env.PORT || 3000;
initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 DSA App on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
