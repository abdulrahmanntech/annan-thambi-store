// ANNAN THAMBI STORE - backend server (Node.js, no external packages)
// Serves the app and stores all shop data on the server in data/store.json.
// Run:  node server.js     then open http://localhost:3000

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const STORE = path.join(DATA_DIR, 'store.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY = 50 * 1024 * 1024; // 50 MB

fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ---- storage: { rev: number, data: {...app data...} } ----
let store = { rev: 0, data: null };
try { store = JSON.parse(fs.readFileSync(STORE, 'utf8')); } catch (e) { /* first run */ }

function today() { return new Date().toISOString().slice(0, 10); }

function persist() {
  const tmp = STORE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store));
  fs.renameSync(tmp, STORE); // atomic replace, no half-written file
  // one backup copy per day
  const b = path.join(BACKUP_DIR, 'store-' + today() + '.json');
  if (!fs.existsSync(b)) fs.copyFileSync(STORE, b);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // ---------- API ----------
  if (url.pathname === '/api/health') return send(res, 200, { ok: true, rev: store.rev });

  // GET /api/data -> { rev, data }   (data is null on first run)
  if (url.pathname === '/api/data' && req.method === 'GET') return send(res, 200, store);

  // PUT /api/data  body: { rev, data }
  // Saved only if rev matches the server's current rev (prevents one device overwriting another's newer data)
  if (url.pathname === '/api/data' && req.method === 'PUT') {
    try {
      const body = JSON.parse(await readBody(req));
      if (!body || typeof body.data !== 'object' || body.data === null) return send(res, 400, { error: 'Invalid data' });
      if (store.data !== null && body.rev !== store.rev) return send(res, 409, { error: 'Data changed on another device', rev: store.rev });
      store = { rev: store.rev + 1, data: body.data };
      persist();
      return send(res, 200, { ok: true, rev: store.rev });
    } catch (e) { return send(res, 400, { error: 'Bad request' }); }
  }

  // GET /api/backup -> download full data file
  if (url.pathname === '/api/backup' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="ats-backup-' + today() + '.json"' });
    return res.end(JSON.stringify(store.data));
  }

  // ---------- static files ----------
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
  let p = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    send(res, 200, buf, TYPES[path.extname(file)] || 'application/octet-stream');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('ANNAN THAMBI STORE backend running on http://localhost:' + PORT);
  console.log('Data file: ' + STORE);
});
