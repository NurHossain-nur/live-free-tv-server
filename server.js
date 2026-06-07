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