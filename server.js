// GMFC Management Information - local server.
// Serves the browser app from ./public and exposes the newest CSV in ./.members.
// No external dependencies: run with `node server.js` (or `npm start`).

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1'; // local only - member data must not be exposed on the network
const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const MEMBERS_DIR = path.join(ROOT, '.members');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

/** Return the most recently modified .csv file in the members directory, or null. */
function findLatestCsv() {
  if (!fs.existsSync(MEMBERS_DIR)) return null;
  const files = fs
    .readdirSync(MEMBERS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.csv'))
    .map((e) => {
      const full = path.join(MEMBERS_DIR, e.name);
      return { name: e.name, full, mtime: fs.statSync(full).mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] || null;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function handleLatestMembers(res) {
  try {
    const latest = findLatestCsv();
    if (!latest) {
      return sendJson(res, 404, { error: `No CSV files found in ${MEMBERS_DIR}` });
    }
    let csv = fs.readFileSync(latest.full, 'utf8');
    if (csv.charCodeAt(0) === 0xfeff) csv = csv.slice(1); // strip BOM
    sendJson(res, 200, { file: latest.name, modified: latest.mtime.toISOString(), csv });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

function serveStatic(urlPath, res) {
  const rel = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath).replace(/^\/+/, '');
  const full = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!full.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (req.method !== 'GET') {
    res.writeHead(405);
    return res.end('Method not allowed');
  }
  if (pathname === '/api/members/latest') return handleLatestMembers(res);
  serveStatic(pathname, res);
});

/** Open a URL in the default browser (used with the --open flag). */
function openBrowser(url) {
  const { spawn } = require('child_process');
  const [cmd, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
    : process.platform === 'darwin' ? ['open', [url]]
    : ['xdg-open', [url]];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref();
}

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  const latest = findLatestCsv();
  console.log(`GMFC MI running at ${url}`);
  console.log(latest ? `Latest members file: ${latest.name}` : `No CSV found in ${MEMBERS_DIR}`);
  if (process.argv.includes('--open')) openBrowser(url);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use - is the app already running? Set PORT to use another.`);
    process.exit(1);
  }
  throw err;
});
