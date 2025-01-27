const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/search', async (req, res) => {
  try {
    const { departure, destination, date } = req.query;

    const response = await axios.get(
      'https://apidojo-booking-v1.p.rapidapi.com/flights/search-airport',
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'apidojo-booking-v1.p.rapidapi.com'
        },
        params: {
          departure,
          destination,
          date
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Flight search failed' });
  }
});

module.exports = router;
