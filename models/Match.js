const mongoose = require('mongoose');

const streamServerSchema = new mongoose.Schema({
  serverName: {
    type: String,
    required: [true, 'Server identifier name is required (e.g., SP-1, Willow)'],
  },
  streamType: {
    type: String,
    enum: ['HLS', 'Embed'],
    required: true,
    default: 'HLS',
  },
  streamUrl: {
    type: String,
    required: [true, 'Streaming source link or embed url is required'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const matchSchema = new mongoose.Schema(
  {
    sport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sport',
      required: [true, 'Associated sport category is required'],
    },
    title: {
      type: String,
      required: [true, 'Match display title is required'],
    },
    status: {
      type: String,
      enum: ['upcoming', 'live', 'finished'],
      required: true,
      default: 'upcoming',
    },
    startTime: {
      type: Date,
      required: [true, 'Match start date and time are required'],
    },
    teamA: {
      name: { type: String, required: true },
      logoUrl: { type: String, default: '' },
    },
    teamB: {
      name: { type: String, required: true },
      logoUrl: { type: String, default: '' },
    },
    // Array of working live video servers
    streamingServers: [streamServerSchema],
    
    // Football Specific Metrics Box
    footballData: {
      minute: { type: Number, default: 0 },
      scoreA: { type: Number, default: 0 },
      scoreB: { type: Number, default: 0 },
      halfTimeScore: {
        scoreA: { type: Number, default: 0 },
        scoreB: { type: Number, default: 0 },
      },
      events: [
        {
          minute: Number,
          team: { type: String, enum: ['A', 'B'] },
          type: { type: String, enum: ['goal', 'yellow_card', 'red_card', 'substitution'] },
          player: String,
          detail: String,
        },
      ],
    },

    // Cricket Specific Metrics Box
    cricketData: {
      currentInnings: { type: Number, enum: [1, 2], default: 1 },
      target: { type: Number, default: 0 },
      statusText: { type: String, default: '' }, // e.g., "Team A needs 45 runs in 24 balls"
      teamAScores: {
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs: { type: Number, default: 0 },
      },
      teamBScores: {
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs: { type: Number, default: 0 },
      },
      batsmen: [
        {
          name: { type: String },
          runs: { type: Number, default: 0 },
          balls: { type: Number, default: 0 },
          fours: { type: Number, default: 0 },
          sixes: { type: Number, default: 0 },
          isStriker: { type: Boolean, default: false },
        },
      ],
      bowler: {
        name: { type: String, default: '' },
        overs: { type: Number, default: 0 },
        maidens: { type: Number, default: 0 },
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Composite indexes optimizing high-volume landing page queries
matchSchema.index({ status: 1, sport: 1, startTime: 1 });

module.exports = mongoose.model('Match', matchSchema);