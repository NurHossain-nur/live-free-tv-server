const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getStreamServers } = require('../controllers/streamController');
const { streamLimiter } = require('../middleware/rateLimiter');

// Apply the strict stream limiter to this specific route
router.get('/:matchId', streamLimiter, getStreamServers);

// 🔥 PASTE THE PROXY ROUTE HERE
// Path becomes: GET /api/v1/streams/proxy-source
router.get('/proxy-source', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).send('Missing target video URL');
    }

    // Fetch the stream from the external source
    const response = await axios.get(targetUrl, { responseType: 'stream' });
    
    // Pass along the correct HLS video header
    res.set('Content-Type', 'application/vnd.apple.mpegurl');
    
    // Pipe the data directly back to your React frontend
    response.data.pipe(res);
  } catch (err) {
    console.error('Proxy Error:', err.message);
    res.status(500).send('Media synchronization interface failed');
  }
});

module.exports = router;