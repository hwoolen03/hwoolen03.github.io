const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

const rapidApiHost = 'booking-com15.p.rapidapi.com';
const rapidApiKey = '4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3';

// Endpoint to search for hotels
app.get('/api/hotels/search', async (req, res) => {
  const { query } = req.query;
  try {
    const response = await axios.get(`https://${rapidApiHost}/api/v1/hotels/searchDestination`, {
      params: { query },
      headers: {
        'x-rapidapi-host': rapidApiHost,
        'x-rapidapi-key': rapidApiKey
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching hotel data:', error);
    res.status(500).json({ error: 'Error fetching hotel data' });
  }
});

// Endpoint to get hotel payment features
app.get('/api/hotels/payment-features', async (req, res) => {
  const { hotel_id } = req.query;
  try {
    const response = await axios.get(`https://${rapidApiHost}/api/v1/hotels/getPaymentFeatures`, {
      params: { hotel_id, languagecode: 'en-us' },
      headers: {
        'x-rapidapi-host': rapidApiHost,
        'x-rapidapi-key': rapidApiKey
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching hotel payment features:', error);
    res.status(500).json({ error: 'Error fetching hotel payment features' });
  }
});

// Endpoint to search for flights
app.get('/api/flights/search', async (req, res) => {
  const { fromId, toId, pageNo, adults, children, sort, cabinClass, currency_code } = req.query;
  try {
    const response = await axios.get(`https://${rapidApiHost}/api/v1/flights/searchFlights`, {
      params: { fromId, toId, pageNo, adults, children, sort, cabinClass, currency_code },
      headers: {
        'x-rapidapi-host': rapidApiHost,
        'x-rapidapi-key': rapidApiKey
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching flight data:', error);
    res.status(500).json({ error: 'Error fetching flight data' });
  }
});

// Endpoint to get minimum flight price
app.get('/api/flights/min-price', async (req, res) => {
  const { fromId, toId, cabinClass, currency_code } = req.query;
  try {
    const response = await axios.get(`https://${rapidApiHost}/api/v1/flights/getMinPrice`, {
      params: { fromId, toId, cabinClass, currency_code },
      headers: {
        'x-rapidapi-host': rapidApiHost,
        'x-rapidapi-key': rapidApiKey
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching minimum flight price:', error);
    res.status(500).json({ error: 'Error fetching minimum flight price' });
  }
});

// Endpoint to get flight details
app.get('/api/flights/details', async (req, res) => {
  const { flightId, currency_code } = req.query;
  try {
    const response = await axios.get(`https://${rapidApiHost}/api/v1/flights/getFlightDetails`, {
      params: { flightId, currency_code },
      headers: {
        'x-rapidapi-host': rapidApiHost,
        'x-rapidapi-key': rapidApiKey
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching flight details:', error);
    res.status(500).json({ error: 'Error fetching flight details' });
  }
});

// Example endpoint for /api/skyId-list
app.get('/api/skyId-list', (req, res) => {
  res.json({
    skyIds: [
      { id: '1', name: 'Sky ID 1' },
      { id: '2', name: 'Sky ID 2' }
      // Add more sky IDs as needed
    ]
  });
});

// Example endpoint for /api/search-roundtrip
app.post('/api/search-roundtrip', (req, res) => {
  const { fromEntityId, toEntityId } = req.body;
  res.json({
    flights: [
      { id: 'flight1', from: fromEntityId, to: toEntityId }
      // Add more flight data as needed
    ]
  });
});

// Example endpoint for /api/cheapest-one-way
app.get('/api/cheapest-one-way', (req, res) => {
  const { fromEntityId, toEntityId } = req.query;
  res.json({
    flight: { id: 'cheapestFlight', from: fromEntityId, to: toEntityId }
  });
});

// Example endpoint for /api/flights/detail
app.get('/api/flights/detail', (req, res) => {
  const { flightId } = req.query;
  res.json({
    flightDetails: { id: flightId, details: 'Flight details here' }
  });
});

// Example endpoint for /api/hotels
app.get('/api/hotels', (req, res) => {
  const { query } = req.query;
  res.json({
    hotels: [
      { id: 'hotel1', name: 'Hotel 1', location: query }
      // Add more hotel data as needed
    ]
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
