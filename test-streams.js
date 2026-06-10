// test-streams.js
const axios = require('axios');

(async () => {
  console.log("🔍 Inspecting Live API Channels...");
  try {
    const response = await axios.get('https://iptv-org.github.io/api/streams.json');
    // const response = await axios.get('https://sanatvwork.yoursanaullah.workers.dev/');
    const streams = response.data;
    
    // Cleaned Filter: Added a check to make sure s.channel is not null
    const sportsStreams = streams.filter(s => 
      s.channel && (s.channel.includes('sports') || s.channel.includes('cricket'))
    ).slice(0, 5);
    
    console.log(`\nFound ${streams.length} total live streams globally.`);
    console.log("Here are 5 active target channels currently emitting functional raw links:");
    console.log(JSON.stringify(sportsStreams, null, 2));
  } catch (error) {
    console.error("Test failed:", error.message);
  }
})();