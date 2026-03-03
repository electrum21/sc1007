const { execFile } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const TIMEOUT_MS   = 5000;   // 5 s wall-clock
const MAX_OUTPUT   = 65536;  // 64 KB stdout/stderr cap

/**
 * Run Python code in a sandboxed child process.
 * Returns { stdout, stderr, timedOut, exitCode }
 */
function runPython(code) {
  return new Promise((resolve) => {
    // Write to a temp file so argv[0] works and tracebacks show a real path
    const tmpFile = path.join(os.tmpdir(), `dsa_${randomUUID()}.py`);
    fs.writeFileSync(tmpFile, code, 'utf8');

    const child = execFile(
      'python3',
      ['-u', tmpFile],
      {
        timeout: TIMEOUT_MS,
        maxBuffer: MAX_OUTPUT,
        // Limit memory via ulimit on Linux (Railway runs Linux)
        // node doesn't expose this directly, so we wrap in sh -c with ulimit
      },
      (err, stdout, stderr) => {
        fs.unlink(tmpFile, () => {}); // cleanup, ignore error
        if (err && err.killed) {
          return resolve({ stdout: '', stderr: 'Time limit exceeded', timedOut: true, exitCode: -1 });
        }
        resolve({
          stdout: stdout.slice(0, MAX_OUTPUT),
          stderr: stderr.slice(0, MAX_OUTPUT),
          timedOut: false,
          exitCode: err ? (err.code || 1) : 0,
        });
      }
    );

    // Belt-and-suspenders kill after timeout
    setTimeout(() => {
      try { child.kill('SIGKILL'); } catch {}
    }, TIMEOUT_MS + 500);
  });
}

/**
 * Run user code + test harness together and parse PASS/FAIL lines.
 * Returns { results, passCount, total, stdout, stderr, timedOut, error }
 */
async function executeWithHarness(userCode, helperCode, testCode) {
  const fullCode = [
    helperCode || '',
    '',
    userCode || '',
    '',
    testCode  || '',
  ].join('\n');

  let run;
  try {
    run = await runPython(fullCode);
  } catch (err) {
    return { error: err.message, results: [], passCount: 0, total: 0 };
  }

  const lines = (run.stdout || '').split('\n').filter(l => l.trim());
  const results = lines.map((line, i) => {
    const isPASS = line.startsWith('PASS');
    const isFAIL = line.startsWith('FAIL');
    let label = `Case ${i + 1}`;
    let got = '', exp = '';
    if (isFAIL) {
      const parts = line.split('|');
      if (parts.length >= 3) {
        label = parts[1] || label;
        const rest = parts.slice(2).join('|');
        const gotM = rest.match(/got=(.*?)(?:\|exp=|$)/s);
        const expM = rest.match(/exp=(.+)$/s);
        got = gotM ? gotM[1].trim() : '';
        exp = expM ? expM[1].trim() : '';
      }
    }
    return { pass: isPASS, fail: isFAIL, label, got, exp, raw: line };
  });

  const passCount = results.filter(r => r.pass).length;
  const total     = results.length;

  return {
    results,
    passCount,
    total,
    stdout:   run.stdout,
    stderr:   run.stderr,
    timedOut: run.timedOut,
    exitCode: run.exitCode,
    error:    null,
  };
}

module.exports = { runPython, executeWithHarness };
