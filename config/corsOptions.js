// Replace with your actual frontend domains when deploying
const allowedOrigins = [
  'http://localhost:5173', // Vite default local port
  'https://live-free-tv.vercel.app',
  'https://www.live-free-tv.vercel.app'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests) 
    // ONLY if you want to. For strict web-only, remove `!origin`
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS. Unauthorized domain attempting to fetch streams.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true, // Required for cookies/sockets if needed later
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;