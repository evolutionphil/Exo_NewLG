
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

// Serve subtitle files
app.get('/api/subtitle-file', async (req, res) => {
  const { lang, id } = req.query;
  
  console.log(`=== Serving subtitle file: ${lang} for OpenSubtitles ID: ${id} ===`);
  
  try {
    // TODO: Replace with real OpenSubtitles API call to download subtitle file
    // For now, we'll create more realistic test content that matches the movie
    
    // Create realistic test subtitles for the specific movie
    const testVTT = `WEBVTT

1
00:00:10.500 --> 00:00:13.200
Welcome to ${lang.toUpperCase()} subtitles

2
00:00:15.000 --> 00:00:18.500
This subtitle file ID: ${id}

3
00:00:20.000 --> 00:00:23.800
Real OpenSubtitles integration needed

4
00:01:00.000 --> 00:01:04.200
Movie dialogue would appear here

5
00:01:30.500 --> 00:01:34.000
Synchronized with video timing
`;

    console.log(`✅ Serving ${lang.toUpperCase()} subtitle file for ID: ${id}`);
    
    res.setHeader('Content-Type', 'text/vtt');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(testVTT);
    
  } catch (error) {
    console.error(`❌ Error serving subtitle file ${id}:`, error);
    
    // Fallback VTT on error
    const fallbackVTT = `WEBVTT

1
00:00:01.000 --> 00:00:05.000
Subtitle loading error - ${error.message}
`;
    
    res.setHeader('Content-Type', 'text/vtt');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(fallbackVTT);
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
