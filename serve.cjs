const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8084;
const DIST_DIR = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const server = http.createServer((req, res) => {
  // Decode and strip query/hash, then resolve against DIST_DIR.
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400, securityHeaders);
    res.end('Bad request');
    return;
  }

  const requested = path.normalize(path.join(DIST_DIR, urlPath));

  // Reject anything that escapes DIST_DIR (path traversal).
  if (requested !== DIST_DIR && !requested.startsWith(DIST_DIR + path.sep)) {
    res.writeHead(403, securityHeaders);
    res.end('Forbidden');
    return;
  }

  let filePath = requested;
  // SPA fallback for non-existent paths / directories.
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, securityHeaders);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { ...securityHeaders, 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`BareStack serving on port ${PORT}`);
});
