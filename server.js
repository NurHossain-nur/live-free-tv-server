require('dotenv').config({ override: true });
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const corsOptions = require('./config/corsOptions');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import the automation service components
const { initStreamAutomation, autoUpdateMatchStreams } = require('./services/streamFetcher');

// Import Routes
const streamRoutes = require('./routes/streamRoutes');
const proxyRoutes = require('./routes/proxyRoutes');

console.log("🔍 ACTUAL MONGO URI BEING USED:", process.env.MONGO_URI);

// Initialize Express & HTTP Server
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: corsOptions.allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Global Middleware
app.use(cors(corsOptions));
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use('/api/', apiLimiter); 

// Root Route Health Check (CRITICAL for Render to know your server is healthy)
app.get('/', (req, res) => {
  res.status(200).json({ status: "healthy", message: "Live TV Server Engine Active" });
});


// 1. Tracks individual users and their timestamps
const channelViewers = {};

// 2. 🔥 NEW: Stores the pre-calculated total (Your Internal Cache)
const cachedCounts = {}; 

// 3. The Pulse Route (Remains the same)
app.post('/api/v1/streams/livecount/:channelId/pulse', (req, res) => {
  const { channelId } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).end();

  if (!channelViewers[channelId]) channelViewers[channelId] = {};
  channelViewers[channelId][userId] = Date.now();
  
  res.status(200).json({ success: true });
});

// 4. The GET Route (Now incredibly fast)
app.get('/api/v1/streams/livecount/:channelId', (req, res) => {
  const channelId = req.params.channelId;
  
  // 🔥 Instantly return the pre-calculated number. ZERO math required.
  const currentCount = cachedCounts[channelId] || 1;
  res.status(200).json({ viewers: currentCount });
});

// 5. Background Cleanup & Math Loop
// Runs exactly once every 15 seconds
setInterval(() => {
  const now = Date.now();
  const TIMEOUT_MS = 60000; 
  
  for (const channelId in channelViewers) {
    let activeCount = 0;
    
    for (const user in channelViewers[channelId]) {
      // If the user hasn't pulsed in 60 seconds, delete them
      if (now - channelViewers[channelId][user] > TIMEOUT_MS) {
        delete channelViewers[channelId][user];
      } else {
        // If they are alive, count them
        activeCount++; 
      }
    }
    
    // 🔥 Save the final number to our internal cache
    cachedCounts[channelId] = activeCount;
  }
}, 15000);


// Mount Routes
app.use('/api/v1/streams', streamRoutes);
app.use('/api/v1/proxy', proxyRoutes);


// Socket.io Event Handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('joinMatchRoom', (matchId) => {
    socket.join(`match_${matchId}`);
  });

  socket.on('leaveMatchRoom', (matchId) => {
    socket.leave(`match_${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// Start Database and then Bind Server to Port
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Force the app to wait until MongoDB is verified alive
    await connectDB();
    
    // 2. Start listening so Render's health checks pass immediately
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io engine active`);
      
      // 3. Start background cron automation safely AFTER the server is online
      initStreamAutomation();
      
      // Run the initial sync safely in the background without blocking the main event loop
      setImmediate(() => {
        console.log("🔄 Running initial match stream sync...");
        autoUpdateMatchStreams().catch(err => console.error("Sync Error:", err));
      });
    });

  } catch (error) {
    console.error("❌ Failed to start the server engine:", error);
    process.exit(1);
  }
};

startServer();