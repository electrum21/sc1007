require('dotenv').config();
const pool = require('./pool');

const schema = `
CREATE TABLE IF NOT EXISTS questions (
  id         TEXT PRIMARY KEY,
  tag        TEXT NOT NULL,
  title      TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium'
);

CREATE TABLE IF NOT EXISTS submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  question_id  TEXT NOT NULL REFERENCES questions(id),
  code         TEXT NOT NULL,
  passed       BOOLEAN NOT NULL DEFAULT false,
  score        INT NOT NULL DEFAULT 0,
  total        INT NOT NULL DEFAULT 0,
  stdout       TEXT,
  stderr       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  question_id  TEXT NOT NULL REFERENCES questions(id),
  completed    BOOLEAN NOT NULL DEFAULT false,
  best_score   INT NOT NULL DEFAULT 0,
  total        INT NOT NULL DEFAULT 0,
  attempts     INT NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

CREATE OR REPLACE VIEW leaderboard AS
SELECT
  session_id,
  MAX(display_name)                                     AS display_name,
  COUNT(DISTINCT question_id) FILTER (WHERE completed)  AS solved,
  COALESCE(SUM(best_score), 0)                          AS total_score,
  COALESCE(SUM(attempts), 0)                            AS total_attempts,
  MAX(updated_at)                                       AS last_active
FROM progress
GROUP BY session_id
ORDER BY solved DESC, total_score DESC, last_active ASC;

CREATE INDEX IF NOT EXISTS idx_submissions_session  ON submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_submissions_question ON submissions(question_id);
CREATE INDEX IF NOT EXISTS idx_progress_session     ON progress(session_id);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations…');
    await client.query(schema);
    console.log('✓ Migration complete');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate().then(() => process.exit(0));
