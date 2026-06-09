// Dev proxy: forwards localhost:5000 → Railway (for BlueStacks via ADB reverse tunnel)
const http = require('http');
const https = require('https');
const url = require('url');

const TARGET = 'https://heartfelt-presence-production-21dc.up.railway.app';
const PORT = 5000;

http.createServer((req, res) => {
  const target = url.parse(TARGET);
  const options = {
    hostname: target.hostname,
    port: 443,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: target.hostname },
  };

  const proxy = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'access-control-allow-origin': '*',
    });
    proxyRes.pipe(res);
  });

  proxy.on('error', (e) => {
    console.error('Proxy error:', e.message);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxy);
}).listen(PORT, () => {
  console.log(`Dev proxy running on http://localhost:${PORT} → ${TARGET}`);
});
