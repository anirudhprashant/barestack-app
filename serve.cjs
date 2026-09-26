const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

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
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json',
};

// Text-ish responses worth compressing.
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.webmanifest', '.map', '.ico']);

// PocketBase runs on a different origin (its own host/port), so the browser
// must be allowed to talk to it. Override via CSP_CONNECT_SRC when the backend
// lives somewhere other than the same-origin / localhost / https defaults.
const CONNECT_SRC =
  process.env.CSP_CONNECT_SRC ||
  "'self' https: http://127.0.0.1:* http://localhost:*";

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  // React/jsPDF set inline style attributes; Google Fonts injects a stylesheet.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  // The invoice preview renders the generated PDF in an iframe from a blob: URL.
  "frame-src 'self' blob:",
  `connect-src ${CONNECT_SRC}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': contentSecurityPolicy,
  // HSTS — instructs browsers to use HTTPS for this origin for a year, including
  // subdomains. Harmless over plain HTTP (browsers ignore it without TLS), so
  // local dev is unaffected; meaningful once TLS terminates upstream. Keep it set
  // at the reverse proxy too if TLS terminates there.
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
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
  // Vite fingerprints everything under /assets, so those can be cached
  // forever; index.html must always be revalidated to pick up new deploys.
  const cacheControl = filePath.startsWith(path.join(DIST_DIR, 'assets') + path.sep)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, securityHeaders);
      res.end('Not found');
      return;
    }
    const headers = { ...securityHeaders, 'Content-Type': contentType, 'Cache-Control': cacheControl, 'Vary': 'Accept-Encoding' };
    const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    if (acceptsGzip && COMPRESSIBLE.has(ext) && content.length > 1024) {
      zlib.gzip(content, (zerr, gz) => {
        if (zerr) {
          res.writeHead(200, headers);
          res.end(req.method === 'HEAD' ? undefined : content);
          return;
        }
        res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip' });
        res.end(req.method === 'HEAD' ? undefined : gz);
      });
      return;
    }
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`BareStack serving on port ${PORT}`);
});
