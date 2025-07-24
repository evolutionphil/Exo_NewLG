const express = require('express');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const app = express();
const port = process.env.PORT || 5000;

app.use(express.static('.'));

// Proxy endpoint to fetch HTTP content and serve it over HTTPS
app.get('/proxy', (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    const proxyReq = protocol.request(targetUrl, (proxyRes) => {
      // Forward status code
      res.status(proxyRes.statusCode);

      // Forward headers (but filter out some problematic ones)
      Object.keys(proxyRes.headers).forEach(key => {
        if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
          res.set(key, proxyRes.headers[key]);
        }
      });

      // Pipe the response
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error('Proxy request error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to fetch resource' });
      }
    });

    proxyReq.setTimeout(15000, () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' });
      }
    });

    proxyReq.end();

  } catch (error) {
    console.error('Invalid URL:', error);
    res.status(400).json({ error: 'Invalid URL provided' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${port}`);
});