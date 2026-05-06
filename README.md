# SD-DAY-SYNC PROTOCOL

A fast-paced, 2D side-scrolling tactical shooter built with **Phaser 3**, **React**, and **Node.js**. Engage in high-octane combat with a dynamic character assembly system, advanced ballistics, and a sophisticated AI companion.

## 🚀 Features

- **Modular Character Assembly**: Characters are dynamically built from separate components (head, torso, arms, legs), allowing for unique visual variety and fluid animations.
- **Advanced Weapon System**:
    - **Multiple Archetypes**: Pistol, SMG, Rifle, Shotgun, Sniper, and Rocket Launcher.
    - **Ballistics Logic**: Zero-G flight for bullets and rockets, hitscan tracers for snipers, and fixed geometric fans for shotguns.
    - **Explosives**: Tactical grenades with gravity-based physics, momentum inheritance, and radial splash damage.
- **AI Companion (Sarge)**: A reliable AI partner that follows your movement and provides fire support during engagements.
- **Persistent Progress**: Secure authentication and high-score tracking via a MongoDB backend.
- **Cinematic Intros**: Scripted story sequences that establish the lore of "Project Raktabij."

## 🛠️ Tech Stack

- **Frontend**: Phaser 3 (Game Engine), React (UI/Overlay), Zustand (State Management), Vite.
- **Backend**: Node.js, Express, MongoDB, JWT Authentication.

## 📦 Installation & Setup

### Prerequisites
- Node.js installed
- MongoDB instance (Local or Atlas)

### Backend Setup
1. Navigate to the `backend` folder.
2. Run `npm install`.
3. Create a `.env` file based on `.env.example`.
4. Run `npm start`.

### Frontend Setup
1. Navigate to the `frontend` folder.
2. Run `npm install`.
3. Run `npm run dev`.

## 🎮 Controls

- **WASD**: Movement
- **SPACE / W**: Jetpack (Thrust)
- **S**: Crouch (Tactical Cover)
- **Mouse**: Aim & Shoot
- **G**: Throw Grenade
- **R**: Reload
- **1 / 2**: Switch Weapon Slots
- **Z**: Toggle Zoom Levels

## 🛡️ Security Note
This repository is configured with `.gitignore` to prevent sensitive credentials (`.env`) and large dependency folders (`node_modules`) from being committed. Ensure you provide your own environment variables for deployment.
