const express = require("express");
const app = express();
require("dotenv").config(); // Load environment variables

// Import route files
const flightsRoutes = require("./routes/flights");
const hotelsRoutes = require("./routes/hotels");

// Middleware for JSON parsing
app.use(express.json());

// Define routes
app.use("/api/flights", flightsRoutes);
app.use("/api/hotels", hotelsRoutes);

// Serve static files from the "public" directory
app.use(express.static("public"));

// Catch-all route to handle "Cannot GET" errors
app.get("*", (req, res) => {
  res.status(404).send("Page not found");
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
