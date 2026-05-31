const mongoose = require('mongoose');

const sportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Sport name is required'],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Sport slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    iconUrl: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    liveMatchCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing for high performance filtering on the homepage slider
sportSchema.index({ isActive: 1, liveMatchCount: -1 });

module.exports = mongoose.model('Sport', sportSchema);