const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/search', async (req, res) => {
  try {
    const { location, checkin, checkout } = req.query;

    const response = await axios.get(
      'https://apidojo-booking-v1.p.rapidapi.com/properties/list',
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'apidojo-booking-v1.p.rapidapi.com'
        },
        params: {
          location,
          checkin,
          checkout,
          page_number: 1,
          rows_per_page: 5
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Hotel search failed' });
  }
});

module.exports = router;
