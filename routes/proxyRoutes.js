const express = require('express');
const router = express.Router();

// INSIDE YOUR EXPRESS BACKEND (Node.js)
router.get('/football', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'Missing URL' });

    // Node.js CAN set the User-Agent! We trick the API into thinking we are a mobile app/browser.
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

module.exports = router;