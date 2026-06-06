const fs = require('fs');
const http = require('http');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PREVIEW_PORT || 4173);
const backendOrigin = process.env.BACKEND_ORIGIN || 'http://127.0.0.1:4000';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function proxyApi(req, res) {
  const target = new URL(req.url, backendOrigin);
  const proxyReq = http.request(
    target,
    {
      method: req.method,
      headers: { ...req.headers, host: target.host }
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: error.message }));
  });

  req.pipe(proxyReq);
}

http
  .createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end();
      return;
    }

    if (req.url.startsWith('/api/')) {
      proxyApi(req, res);
      return;
    }

    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const requestedPath = path.normalize(path.join(distDir, urlPath));
    const filePath = requestedPath.startsWith(distDir) && fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()
      ? requestedPath
      : path.join(distDir, 'index.html');

    sendFile(res, filePath);
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`Preview server listening on http://127.0.0.1:${port}`);
  });
