
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Serve subtitle files - fetch real data from exoapp.tv
app.get('/api/subtitle-file', async (req, res) => {
  const { lang, id } = req.query;
  
  console.log(`=== Serving subtitle file: ${lang} for ID: ${id} ===`);
  
  try {
    const https = require('https');
    
    // Fetch real subtitle from exoapp.tv API
    const subtitleUrl = `https://exoapp.tv/api/subtitle-file?lang=${lang}&id=${id}`;
    
    console.log(`Fetching real subtitle from: ${subtitleUrl}`);
    
    const request = https.get(subtitleUrl, (response) => {
      let data = '';
      
      response.setEncoding('utf8');
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        if (response.statusCode === 200 && data.length > 10) {
          console.log(`✅ Successfully fetched real subtitle file: ${data.length} bytes`);
          console.log(`First 200 chars: ${data.substring(0, 200)}...`);
          
          // Return real SRT content with proper headers
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          
          res.send(data);
        } else {
          console.error(`HTTP Error: ${response.statusCode}`);
          throw new Error(`Failed to fetch subtitle: HTTP ${response.statusCode}`);
        }
      });
    });
    
    request.on('error', (error) => {
      console.error(`Request error: ${error.message}`);
      throw error;
    });
    
    request.setTimeout(20000, () => {
      request.destroy();
      throw new Error('Request timeout');
    });
    
  } catch (error) {
    console.error(`❌ Error fetching subtitle ${id}:`, error.message);
    
    // Return error message in SRT format  
    const errorSRT = `1
00:00:01,000 --> 00:00:05,000
Unable to load ${lang.toUpperCase()} subtitles

2
00:00:06,000 --> 00:00:10,000
Subtitle ID: ${id}

3
00:00:11,000 --> 00:00:15,000
Error: ${error.message}
`;
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(errorSRT);
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
