const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to verify token
const authMiddleware = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

// Update highest wave
router.post('/update', authMiddleware, async (req, res) => {
    try {
        const { highestWave, score } = req.body;
        
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        let updated = false;
        if (highestWave && highestWave > user.highestWave) {
            user.highestWave = highestWave;
            updated = true;
        }
        if (score && score > user.highScore) {
            user.highScore = score;
            updated = true;
        }

        if (updated) {
            await user.save();
        }

        res.json({ highestWave: user.highestWave, highScore: user.highScore });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update armory loadout and appearance
router.put('/armory', authMiddleware, async (req, res) => {
    try {
        const { appearance, selectedWeapons } = req.body;
        
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (appearance) user.appearance = appearance;
        if (selectedWeapons) user.selectedWeapons = selectedWeapons;

        await user.save();
        res.json({ appearance: user.appearance, selectedWeapons: user.selectedWeapons });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
