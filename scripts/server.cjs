const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const DIST_DIR = path.join(__dirname, '..', 'dist');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
};

const SECURITY_HEADERS = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.pocketbase.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.barestack.org https://cdn.pocketbase.io wss://api.barestack.org; img-src 'self' data: https:; frame-ancestors 'none';",
    'X-XSS-Protection': '1; mode=block',
};

const server = http.createServer((req, res) => {
    // Apply security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

    // Handle SPA routing - serve index.html for non-file routes
    if (!path.extname(filePath)) {
        filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // SPA fallback
                fs.readFile(path.join(DIST_DIR, 'index.html'), (err, content) => {
                    if (err) {
                        res.writeHead(500);
                        res.end('Server Error');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content);
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`BareStack CRM running on port ${PORT}`);
});
