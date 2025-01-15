const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    authProvider: { type: String, required: true } // e.g., 'github', 'google', 'facebook'
});

module.exports = mongoose.model('User', userSchema);
