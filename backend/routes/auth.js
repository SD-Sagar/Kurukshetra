const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            username,
            password: hashedPassword
        });

        await user.save();

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ 
                token, 
                user: { 
                    id: user.id, 
                    username: user.username, 
                    avatarUrl: user.avatarUrl,
                    appearance: user.appearance,
                    selectedWeapons: user.selectedWeapons
                } 
            });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        let user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ 
                token, 
                user: { 
                    id: user.id, 
                    username: user.username, 
                    avatarUrl: user.avatarUrl, 
                    highestWave: user.highestWave,
                    appearance: user.appearance,
                    selectedWeapons: user.selectedWeapons
                } 
            });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
