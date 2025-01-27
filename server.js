require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL
}));
app.use(express.json());

// Routes
const flightRoutes = require('./routes/flights');
const hotelRoutes = require('./routes/hotels');
app.use('/api/flights', flightRoutes);
app.use('/api/hotels', hotelRoutes);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
