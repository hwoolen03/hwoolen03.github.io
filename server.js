const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.json());

const users = []; // In-memory storage for simplicity

app.post('/save-login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    
    if (user) {
        if (user.password === password) {
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.json({ success: false, message: 'Incorrect password' });
        }
    } else {
        users.push({ username, password });
        res.json({ success: true, message: 'Registration successful' });
    }
});

app.post('/google-login', (req, res) => {
    const { token } = req.body;
    // Here you would validate the Google token and extract user info, for simplicity we simulate success
    res.json({ success: true, message: 'Google login successful' });
});

app.post('/facebook-login', (req, res) => {
    const { token } = req.body;
    // Here you would validate the Facebook token and extract user info, for simplicity we simulate success
    res.json({ success: true, message: 'Facebook login successful' });
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
