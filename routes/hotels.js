const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

const RAPIDAPI_KEY = "4fbc13fa91msh7eaf58f815807b2p1d89f0jsnec07b5b547c3";
const RAPIDAPI_HOST = "booking-com15.p.rapidapi.com";

// Helper function to fetch data from RapidAPI
const fetchFromRapidAPI = async (url) => {
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": RAPIDAPI_HOST,
        },
    });
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.json();
};

// Endpoint: Search Hotel Destinations
router.get("/search-destination", async (req, res) => {
    const { query } = req.query; // Example: ?query=man
    const url = `https://${RAPIDAPI_HOST}/api/v1/hotels/searchDestination?query=${query}`;
    try {
        const data = await fetchFromRapidAPI(url);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint: Search Hotels
router.get("/search-hotels", async (req, res) => {
    const { dest_id, search_type, adults, children_age, room_qty, page_number, units, temperature_unit, languagecode, currency_code } = req.query;
    const url = `https://${RAPIDAPI_HOST}/api/v1/hotels/searchHotels?dest_id=${dest_id}&search_type=${search_type}&adults=${adults}&children_age=${children_age}&room_qty=${room_qty}&page_number=${page_number}&units=${units}&temperature_unit=${temperature_unit}&languagecode=${languagecode}&currency_code=${currency_code}`;
    try {
        const data = await fetchFromRapidAPI(url);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint: Get Hotel Details
router.get("/get-hotel-details", async (req, res) => {
    const { hotel_id, adults, children_age, room_qty, units, temperature_unit, languagecode, currency_code } = req.query;
    const url = `https://${RAPIDAPI_HOST}/api/v1/hotels/getHotelDetails?hotel_id=${hotel_id}&adults=${adults}&children_age=${children_age}&room_qty=${room_qty}&units=${units}&temperature_unit=${temperature_unit}&languagecode=${languagecode}&currency_code=${currency_code}`;
    try {
        const data = await fetchFromRapidAPI(url);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint: Get Hotel Availability
router.get("/get-availability", async (req, res) => {
    const { hotel_id, currency_code } = req.query;
    const url = `https://${RAPIDAPI_HOST}/api/v1/hotels/getAvailability?hotel_id=${hotel_id}&currency_code=${currency_code}`;
    try {
        const data = await fetchFromRapidAPI(url);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint: Get Room List
router.get("/get-room-list", async (req, res) => {
    const { hotel_id, adults, children_age, room_qty, units, temperature_unit, languagecode, currency_code } = req.query;
    const url = `https://${RAPIDAPI_HOST}/api/v1/hotels/getRoomList?hotel_id=${hotel_id}&adults=${adults}&children_age=${children_age}&room_qty=${room_qty}&units=${units}&temperature_unit=${temperature_unit}&languagecode=${languagecode}&currency_code=${currency_code}`;
    try {
        const data = await fetchFromRapidAPI(url);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
