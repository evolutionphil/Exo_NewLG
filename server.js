
const express = require('express');
const path = require('path');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware to handle cross-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from the current directory
app.use(express.static('.'));

// Route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Subtitle API endpoint - matches what your app expects
app.post('/api/get-subtitles', async (req, res) => {
  try {
    console.log('=== Subtitle Request Received ===');
    console.log('Request data:', req.body);
    
    const { movie_name, tmdb_id, movie_type, season_number, episode_number } = req.body;
    
    // Build query for OpenSubtitles API (you'll need an API key)
    let searchParams = {};
    
    if (tmdb_id) {
      searchParams.tmdb_id = tmdb_id;
    } else {
      // Fallback to title search
      searchParams.query = movie_name;
    }
    
    if (movie_type === 'episode') {
      searchParams.season_number = season_number;
      searchParams.episode_number = episode_number;
    }
    
    // For now, return mock data that matches your app's expected format
    // Replace this with actual OpenSubtitles API call
    const mockSubtitles = [
      {
        label: 'English',
        file: '/api/subtitle-file?lang=en&id=' + (tmdb_id || 'mock'),
        lang: 'en'
      },
      {
        label: 'Spanish', 
        file: '/api/subtitle-file?lang=es&id=' + (tmdb_id || 'mock'),
        lang: 'es'
      },
      {
        label: 'French',
        file: '/api/subtitle-file?lang=fr&id=' + (tmdb_id || 'mock'), 
        lang: 'fr'
      }
    ];
    
    console.log('=== Returning subtitles ===');
    console.log('Subtitles count:', mockSubtitles.length);
    
    // Return the exact format your app expects
    res.json({
      status: 'success',
      subtitles: mockSubtitles
    });
    
  } catch (error) {
    console.log('=== Subtitle API Error ===');
    console.log('Error:', error);
    
    res.json({
      status: 'error',
      message: error.message,
      subtitles: []
    });
  }
});

// Serve M3U file with proxy URLs
app.get('/m3u/yenideneme1', (req, res) => {
  const fs = require('fs');
  const m3uPath = path.join(__dirname, 'assets', 'tv_channels_yenideneme1.m3u');
  
  console.log('=== Serving M3U file with proxy URLs ===');
  
  try {
    let m3uContent = fs.readFileSync(m3uPath, 'utf8');
    
    // Replace HTTP URLs with our proxy URLs  
    m3uContent = m3uContent.replace(/http:\/\/galaiptv\.shop:2095/g, 
      `${req.protocol}://${req.get('host')}/proxy?url=http://galaiptv.shop:2095`);
    
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Content-Disposition', 'inline; filename="tv_channels_yenideneme1.m3u"');
    res.send(m3uContent);
    
  } catch (error) {
    console.error('Error serving M3U file:', error);
    res.status(500).send('Error serving M3U file');
  }
});

// Simple proxy using query parameters to avoid path issues
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  console.log(`=== Proxying request: ${targetUrl} ===`);
  
  try {
    const response = await axios({
      method: 'GET',
      url: targetUrl,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': req.headers['user-agent'] || 'IPTV-Proxy/1.0'
      }
    });
    
    // Set CORS headers for streaming
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    // Forward content headers
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    
    // Pipe the stream response
    response.data.pipe(res);
    
  } catch (error) {
    console.error(`Proxy error for ${targetUrl}:`, error.message);
    res.status(502).json({ 
      error: 'Proxy error', 
      message: error.message,
      url: targetUrl 
    });
  }
});

// Serve subtitle files
app.get('/api/subtitle-file', (req, res) => {
  const { lang, id } = req.query;
  
  console.log(`=== Serving subtitle file: ${lang} for ${id} ===`);
  
  // Mock VTT subtitle content
  const mockVTT = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
[${lang.toUpperCase()}] This is a sample subtitle

2
00:00:05.000 --> 00:00:08.000
[${lang.toUpperCase()}] Replace this with real subtitle content

3
00:00:10.000 --> 00:00:13.000
[${lang.toUpperCase()}] From your subtitle service
`;
  
  res.setHeader('Content-Type', 'text/vtt');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(mockVTT);
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
