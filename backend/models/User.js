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
    highScore: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
