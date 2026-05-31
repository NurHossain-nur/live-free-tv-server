require('dotenv').config({ override: true });
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const corsOptions = require('./config/corsOptions');
const { apiLimiter } = require('./middleware/rateLimiter');

// 1. Import the automation service components
const { initStreamAutomation, autoUpdateMatchStreams } = require('./services/streamFetcher');

// Import Routes
const streamRoutes = require('./routes/streamRoutes');

console.log("🔍 ACTUAL MONGO URI BEING USED:", process.env.MONGO_URI);

// Initialize Database & Start Automation Tasks
connectDB().then(() => {
  // 2. Start the automation engine loop
  initStreamAutomation();
  
  // OPTIONAL: Run a manual sync immediately on boot to ensure your active matches have links right away
  autoUpdateMatchStreams();
});

// Initialize Express & HTTP Server
const app = express();
const server = http.createServer(app);

// Initialize Socket.io (Attached to HTTP server)
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

// Mount Routes
app.use('/api/v1/streams', streamRoutes);

// Socket.io Event Handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('joinMatchRoom', (matchId) => {
    socket.join(`match_${matchId}`);
    console.log(`User ${socket.id} joined room: match_${matchId}`);
  });

  socket.on('leaveMatchRoom', (matchId) => {
    socket.leave(`match_${matchId}`);
    console.log(`User ${socket.id} left room: match_${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io engine active`);
});