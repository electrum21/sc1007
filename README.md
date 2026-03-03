# DSA Complete Guide — Full-Stack App

Node.js + Express + PostgreSQL. Real Python code execution, progress tracking, and a leaderboard. No accounts or login required.

## How it works

- On first visit, a **session UUID** is generated and saved in `localStorage` — this is your identity
- Set a display name in the sidebar — it shows up on the leaderboard
- Submit code → runs in a sandboxed Python process on the server → results saved to DB
- Progress badges (✓) appear on questions you've solved

## Stack

```
dsa-app/
├── server/
│   ├── index.js                Express entry, static serving, rate limiting
│   ├── db/
│   │   ├── pool.js             PostgreSQL connection pool
│   │   ├── migrate.js          Creates tables + leaderboard view
│   │   └── seed.js             Inserts question metadata
│   ├── executors/python.js     Sandboxed child_process runner (5s timeout)
│   └── routes/
│       ├── submissions.js      POST (execute+save) · GET (history)
│       └── leaderboard.js      GET top 25
└── client/index.html           Full DSA guide + execution UI + leaderboard
```

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/submissions` | Execute code, save result |
| GET  | `/api/submissions?session_id=` | Submission history |
| GET  | `/api/leaderboard` | Top 25 by questions solved |
| GET  | `/api/health` | Health check |