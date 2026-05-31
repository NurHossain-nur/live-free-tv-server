const axios = require('axios');
const cron = require('node-cron');
const Match = require('../models/Match');

/**
 * Core function that pulls from the free public IPTV API,
 * finds matches that are live/upcoming, and maps the links.
 */
const autoUpdateMatchStreams = async () => {
  console.log('🔄 [Background Worker] Syncing live streams with active matches...');
  try {
    // 1. Fetch active streams from public aggregator
    const streamsRes = await axios.get('https://iptv-org.github.io/api/streams.json');
    const allStreams = streamsRes.data;

    // 2. Find all matches in your database that are currently LIVE or UPCOMING
    const activeMatches = await Match.find({ status: { $in: ['live', 'upcoming'] } });

    if (activeMatches.length === 0) {
      console.log('ℹ️ No active or upcoming matches found in the database to sync.');
      return;
    }

    for (let match of activeMatches) {
      let freshServers = [];

      // 3. Normalize team names to match against streaming channels
      const teamAKeyword = match.teamA && match.teamA.name ? match.teamA.name.toLowerCase() : '';
      const teamBKeyword = match.teamB && match.teamB.name ? match.teamB.name.toLowerCase() : '';

      // Look for streams explicitly mentioning either team or fallback to general sports channels
      let foundStreams = allStreams.filter(stream => {
        // Safe guard check: skip if stream or stream.channel is missing
        if (!stream || !stream.channel) return false;
        
        const channelId = stream.channel.toLowerCase();
        return (teamAKeyword && channelId.includes(teamAKeyword)) || 
               (teamBKeyword && channelId.includes(teamBKeyword));
      });

      // If no match-specific channel is found, grab top general sports channels safely
      if (foundStreams.length === 0) {
        foundStreams = allStreams.filter(stream => 
          stream && stream.channel && (stream.channel.includes('sports') || stream.channel.includes('cricket'))
        ).slice(0, 3);
      }

      // 4. Format streams to match your streamingServers schema structure
      freshServers = foundStreams.map((stream, index) => ({
        serverName: `Free Server ${index + 1} (${stream.channel.split('.')[0].toUpperCase()})`,
        streamType: 'HLS',
        streamUrl: stream.url,
        isActive: true
      }));

      // 5. Commit updates directly to the specific match in MongoDB
      match.streamingServers = freshServers;
      await match.save();
      console.log(`✅ Successfully updated "${match.title}" with ${freshServers.length} active streams.`);
    }
  } catch (error) {
    console.error('❌ Automation stream sync failed:', error.message);
  }
};

/**
 * Initialization function to register the scheduling loop
 */
const initStreamAutomation = () => {
  // Schedules the job to run automatically every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    autoUpdateMatchStreams();
  });
  console.log('⏰ Automated Cron Engine: Registered to check streams every 30 minutes.');
};

module.exports = {
  initStreamAutomation,
  autoUpdateMatchStreams
};