const express = require('express');
const punycode = require('punycode');
const app = express();
const flightsRoutes = require('./routes/flights');
const hotelsRoutes = require('./routes/hotels');

app.use('/api/flights', flightsRoutes);
app.use('/api/hotels', hotelsRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the API');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
