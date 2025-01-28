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

// Endpoint: Search Flight Destinations
router.get("/search-destination", async (req, res) => {
    const { query } = req.query; // Example: ?query=new
    const url = `https://${RAPIDAPI_HOST}/api/v1/flights/searchDestination?query=${query}`;
    try {
        const data = await fetchFromRapidAPI(url);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint: Search Flights
router.get("/search-flights", async (req, res) => {
    const { fromId, toId, pageNo, adults, children, sort, cabinClass, currency_code } = req.query;
    const url = `https://${RAPIDAPI_HOST}/api/v1/flights/searchFlights?fromId=${fromId}&toId=${toId}&pageNo=${pageNo}&adults=${adults}&children=${children}&sort=${sort}&cabinClass=${cabinClass}&currency_code=${currency_code}`;
    try {
        const data = await fetchFromRapidAPI(url);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint: Get Minimum Price for Flights
router.get("/get-min-price", async (req, res) => {
    const { fromId, toId, cabinClass, currency_code } = req.query;
    const url = `https://${RAPIDAPI_HOST}/api/v1/flights/getMinPrice?fromId=${fromId}&toId=${toId}&cabinClass=${cabinClass}&currency_code=${currency_code}`;
    try {
        const data = await fetchFromRapidAPI(url);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint: Get Flight Details
router.get("/get-flight-details", async (req, res) => {
    const { currency_code } = req.query;
    const url = `https://${RAPIDAPI_HOST}/api/v1/flights/getFlightDetails?currency_code=${currency_code}`;
    try {
        const data = await fetchFromRapidAPI(url);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint: Get Minimum Price for Multi-Stop Flights
router.get("/get-min-price-multi-stops", async (req, res) => {
    const { legs, cabinClass, currency_code } = req.query;
    const url = `https://${RAPIDAPI_HOST}/api/v1/flights/getMinPriceMultiStops?legs=${encodeURIComponent(legs)}&cabinClass=${cabinClass}&currency_code=${currency_code}`;
    try {
        const data = await fetchFromRapidAPI(url);
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
