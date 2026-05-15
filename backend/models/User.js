const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    avatarUrl: {
        type: String,
        default: '' // Can be populated with Cloudinary URL later
    },
    highestWave: {
        type: Number,
        default: 0
    },
    totalKills: {
        type: Number,
        default: 0
    },
    appearance: {
        head: { type: String, default: 'Commando' },
        torso: { type: String, default: 'Commando' },
        legs: { type: String, default: 'Commando' },
        arms: { type: String, default: 'commando' }
    },
    selectedWeapons: {
        type: [String],
        default: ['pistol', null]
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
