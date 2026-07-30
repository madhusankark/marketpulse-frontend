const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BUILD_DIR = path.join(__dirname, 'build');

const MIME_TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  if (req.url === '/config.js') {
    const apiUrl = process.env.REACT_APP_API_URL || '';
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    return res.end(`window.REACT_APP_API_URL=${JSON.stringify(apiUrl)};`);
  }

  let filePath = path.join(BUILD_DIR, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (ext === '.html') {
      const apiUrl = process.env.REACT_APP_API_URL || '';
      content = content.replace('</head>', `<script src="/config.js"></script></head>`);
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return res.end(content);
  }

  const indexPath = path.join(BUILD_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    const apiUrl = process.env.REACT_APP_API_URL || '';
    content = content.replace('</head>', `<script src="/config.js"></script></head>`);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(content);
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});