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

// Get latest record
router.get('/record', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ totalKills: user.totalKills, highestWave: user.highestWave });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Update highest wave and cumulative score
router.post('/update', authMiddleware, async (req, res) => {
    try {
        const { highestWave, score, killsDelta } = req.body;
        console.log(`[Score Sync] ID: ${req.user.id}, Delta: ${killsDelta}, Wave: ${highestWave}`);
        
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        let updated = false;
        
        // Update wave if higher
        if (highestWave !== undefined && highestWave > user.highestWave) {
            user.highestWave = highestWave;
            updated = true;
        }

        // CUMULATIVE SCORE logic
        if (killsDelta !== undefined) {
            user.totalKills += killsDelta;
            updated = true;
        }

        if (updated) {
            await user.save();
            console.log(`[Score Saved] ${user.username} -> Total Kills: ${user.totalKills}, Wave: ${user.highestWave}`);
        }

        res.json({ highestWave: user.highestWave, totalKills: user.totalKills });
    } catch (err) {
        console.error("[Score Error]", err.message);
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
