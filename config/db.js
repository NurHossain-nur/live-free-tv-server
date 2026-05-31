const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // If process.env.MONGO_URI is missing, it falls back to your live cluster link.
    // Notice we removed "?live_game=Cluster0" and replaced it with standard options.
    const connString = process.env.MONGO_URI || "mongodb+srv://live_game:P0ZOnJlAuF7xyJZt@cluster0.w4pecde.mongodb.net/sportzfy_clone?retryWrites=true&w=majority";

    const conn = await mongoose.connect(connString);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // Crash the server safely so you know it failed
  }
};

module.exports = connectDB;