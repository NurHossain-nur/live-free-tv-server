const Match = require('../models/Match');

// @desc    Get active streaming servers for a specific match
// @route   GET /api/v1/streams/:matchId
// @access  Public (Protected by CORS & Rate Limiter)
const getStreamServers = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId).select('status streamingServers title');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found',
      });
    }

    // Optional: Prevent users from loading streams for matches that haven't started
    if (match.status === 'upcoming') {
      return res.status(403).json({
        success: false,
        message: 'Match has not started yet. Streams are unavailable.',
        data: [],
      });
    }

    // Filter out any servers that have been marked as inactive/dead
    const activeServers = match.streamingServers.filter(server => server.isActive);

    res.status(200).json({
      success: true,
      matchTitle: match.title,
      data: activeServers,
    });
  } catch (error) {
    console.error(`Stream Fetch Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching stream data',
    });
  }
};

module.exports = { getStreamServers };