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
  pingTimeout: 10000,  // 🔥 NEW: Drop them after 10 seconds of no response
  pingInterval: 15000  // 🔥 NEW: Ping them every 15 seconds to check if alive
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

// Mount Routes
app.use('/api/v1/streams', streamRoutes);
app.use('/api/v1/proxy', proxyRoutes);

// Object to keep track of active user counts per channel/match
// Format: { '1': 5, 'match_12345': 12 }
const roomViewers = {};

// Socket.io Event Handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Track what room this specific client is currently looking at
  let currentRoom = null;

  // --- 1. HANDLE LIVE TV CHANNEL JOINING ---
  socket.on('join_channel', (channelId) => {
    const roomName = `channel_${channelId}`;
    
    // Safety check: if they were in a room before, leave it first
    if (currentRoom && currentRoom !== roomName) {
      socket.leave(currentRoom);
      decreaseRoomCount(currentRoom);
    }

    currentRoom = roomName;
    socket.join(roomName);
    
    // Increase count for this channel
    roomViewers[roomName] = (roomViewers[roomName] || 0) + 1;
    
    // Tell everyone in this room what the new total count is
    io.to(roomName).emit('viewer_update', roomViewers[roomName]);
  });

  // --- 1.5 HANDLE LEAVING CHANNELS MANUALLY ---
  socket.on('leave_channel', (channelId) => {
    const roomName = `channel_${channelId}`;
    socket.leave(roomName);
    decreaseRoomCount(roomName);
    if (currentRoom === roomName) currentRoom = null;
  });

  // --- 2. HANDLE MATCH ROOM JOINING (Your existing logic upgraded) ---
  socket.on('joinMatchRoom', (matchId) => {
    const roomName = `match_${matchId}`;
    
    if (currentRoom && currentRoom !== roomName) {
      socket.leave(currentRoom);
      decreaseRoomCount(currentRoom);
    }

    currentRoom = roomName;
    socket.join(roomName);

    roomViewers[roomName] = (roomViewers[roomName] || 0) + 1;
    io.to(roomName).emit('viewer_update', roomViewers[roomName]);
  });

  socket.on('leaveMatchRoom', (matchId) => {
    const roomName = `match_${matchId}`;
    socket.leave(roomName);
    decreaseRoomCount(roomName);
    if (currentRoom === roomName) currentRoom = null;
  });

  // --- 3. HELPER CLEANUP FUNCTION ---
  const decreaseRoomCount = (roomName) => {
    if (roomViewers[roomName]) {
      roomViewers[roomName]--;
      if (roomViewers[roomName] <= 0) roomViewers[roomName] = 0;
      
      // Broadcast the lowered count to the remaining viewers
      io.to(roomName).emit('viewer_update', roomViewers[roomName]);
    }
  };

  // --- 4. DISCONNECT CLEANUP (When they close the tab) ---
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    if (currentRoom) {
      decreaseRoomCount(currentRoom);
    }
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