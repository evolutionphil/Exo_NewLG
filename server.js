
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files from the current directory
app.use(express.static('.'));

// Route to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
// Debug endpoint for testing
app.post('/debug_panel/device_info', (req, res) => {
  console.log('=== DEBUG ENDPOINT CALLED ===');
  console.log('Request body:', req.body);
  
  // Mock response for testing
  const mockResponse = {
    data: "mock_encrypted_response_for_testing"
  };
  
  console.log('Sending mock response:', mockResponse);
  res.json(mockResponse);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
});
