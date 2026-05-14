/**
 * PvP Server Logic
 * Handles room management, player synchronization, and game state.
 */

const rooms = new Map();

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // --- Room Management ---

        socket.on('create_room', (playerData) => {
            const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
            const room = {
                code: roomCode,
                admin: socket.id,
                players: new Map(),
                state: 'LOBBY', // LOBBY, IN_GAME, RESULTS
                matchTimer: 300, // Default 5 mins in seconds
                remainingTime: 300,
                countdown: 7,
                countdownActive: false
            };

            const player = {
                id: socket.id,
                name: playerData.name || 'Soldier',
                avatar: playerData.avatar || {},
                isReady: false,
                isOnline: true,
                kills: 0,
                deaths: 0
            };

            room.players.set(socket.id, player);
            rooms.set(roomCode, room);

            socket.join(roomCode);
            socket.emit('room_created', { 
                roomCode, 
                players: Array.from(room.players.values()),
                adminId: room.admin
            });
            console.log(`Room created: ${roomCode} by ${socket.id}`);
        });

        socket.on('join_room', ({ roomCode, playerData }) => {
            const room = rooms.get(roomCode);

            if (!room) {
                socket.emit('error_message', 'Room not found');
                return;
            }

            // If match is in progress, player waits in lobby
            if (room.state === 'IN_GAME') {
                socket.join(roomCode);
                socket.emit('match_in_progress', { 
                    remainingTime: room.remainingTime,
                    players: Array.from(room.players.values()) 
                });
                return;
            }

            const player = {
                id: socket.id,
                name: playerData.name || 'Soldier',
                avatar: playerData.avatar || {},
                isReady: false,
                isOnline: true,
                kills: 0,
                deaths: 0
            };

            room.players.set(socket.id, player);
            socket.join(roomCode);

            io.to(roomCode).emit('player_joined', { 
                players: Array.from(room.players.values()),
                newPlayer: player,
                adminId: room.admin
            });
            console.log(`User ${socket.id} joined room: ${roomCode}`);
        });

        // --- Lobby Logic ---

        socket.on('toggle_ready', ({ roomCode }) => {
            const room = rooms.get(roomCode);
            if (!room || room.state !== 'LOBBY') return;

            const player = room.players.get(socket.id);
            if (!player) return;

            // Lock unready if countdown < 4s
            if (room.countdownActive && room.countdown < 4 && player.isReady) {
                socket.emit('error_message', 'Match starting soon, ready status locked!');
                return;
            }

            player.isReady = !player.isReady;
            io.to(roomCode).emit('ready_status_updated', Array.from(room.players.values()));

            checkAllReady(roomCode);
        });

        socket.on('set_match_timer', ({ roomCode, durationMinutes }) => {
            const room = rooms.get(roomCode);
            if (!room || room.admin !== socket.id || room.state !== 'LOBBY') return;

            room.matchTimer = durationMinutes * 60;
            room.remainingTime = room.matchTimer;
            io.to(roomCode).emit('match_timer_updated', durationMinutes);
        });

        // --- Game Logic ---

        socket.on('player_update', ({ roomCode, transform }) => {
            const room = rooms.get(roomCode);
            if (!room || room.state !== 'IN_GAME') return;

            // Broadcast movement/animation to others
            socket.to(roomCode).emit('remote_player_update', {
                id: socket.id,
                transform
            });
        });

        socket.on('player_fire', ({ roomCode, angle, weapon }) => {
            const room = rooms.get(roomCode);
            if (!room || room.state !== 'IN_GAME') return;

            socket.to(roomCode).emit('player_fire', {
                id: socket.id,
                angle,
                weapon
            });
        });

        socket.on('player_hit', ({ roomCode, victimId, damage }) => {
            const room = rooms.get(roomCode);
            if (!room || room.state !== 'IN_GAME') return;

            // Send hit to the specific victim
            io.to(victimId).emit('player_hit', { damage, attackerId: socket.id });
        });

        socket.on('player_death', ({ roomCode }) => {
            const room = rooms.get(roomCode);
            if (!room || room.state !== 'IN_GAME') return;

            const victim = room.players.get(socket.id);
            if (!victim) return;

            victim.deaths++;
            
            // Broadcast death so others can show animation
            io.to(roomCode).emit('kill_announcement', {
                victimId: socket.id,
                victimName: victim.name,
                killerId: 'unknown', // We don't track the exact final hit killer yet for simplicity
                killerName: 'An Opponent'
            });
        });

        // --- Lifecycle ---

        socket.on('leave_room', ({ roomCode }) => {
            handleDeparture(socket, roomCode);
        });

        socket.on('disconnect', () => {
            // Find which room this socket was in
            rooms.forEach((room, roomCode) => {
                if (room.players.has(socket.id)) {
                    handleDeparture(socket, roomCode);
                }
            });
        });
    });

    function checkAllReady(roomCode) {
        const room = rooms.get(roomCode);
        if (!room) return;

        const allReady = Array.from(room.players.values()).every(p => p.isReady || !p.isOnline);

        if (allReady && !room.countdownActive) {
            startCountdown(roomCode);
        } else if (!allReady && room.countdownActive) {
            stopCountdown(roomCode);
        }
    }

    function startCountdown(roomCode) {
        const room = rooms.get(roomCode);
        if (!room) return;

        room.countdownActive = true;
        room.countdown = 7;

        room.countdownInterval = setInterval(() => {
            room.countdown--;
            io.to(roomCode).emit('countdown_tick', room.countdown);

            if (room.countdown <= 0) {
                clearInterval(room.countdownInterval);
                startMatch(roomCode);
            }
        }, 1000);
    }

    function stopCountdown(roomCode) {
        const room = rooms.get(roomCode);
        if (!room) return;

        clearInterval(room.countdownInterval);
        room.countdownActive = false;
        room.countdown = 7;
        io.to(roomCode).emit('countdown_cancelled');
    }

    function startMatch(roomCode) {
        const room = rooms.get(roomCode);
        if (!room) return;

        room.state = 'IN_GAME';
        io.to(roomCode).emit('match_started');

        room.gameInterval = setInterval(() => {
            room.remainingTime--;
            io.to(roomCode).emit('timer_tick', room.remainingTime);

            if (room.remainingTime <= 0) {
                endMatch(roomCode);
            }
        }, 1000);
    }

    function endMatch(roomCode) {
        const room = rooms.get(roomCode);
        if (!room) return;

        clearInterval(room.gameInterval);
        room.state = 'RESULTS';
        
        const leaderboard = Array.from(room.players.values())
            .sort((a, b) => b.kills - a.kills);

        io.to(roomCode).emit('match_ended', leaderboard);
    }

    function handleDeparture(socket, roomCode) {
        const room = rooms.get(roomCode);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (!player) return;

        if (room.state === 'LOBBY') {
            // Remove completely from lobby
            room.players.delete(socket.id);
            socket.leave(roomCode);
            
            if (room.players.size === 0) {
                rooms.delete(roomCode);
                console.log(`Room ${roomCode} deleted (empty)`);
            } else {
                // If admin left, assign new admin
                if (room.admin === socket.id) {
                    room.admin = Array.from(room.players.keys())[0];
                    io.to(roomCode).emit('new_admin', room.admin);
                }
                io.to(roomCode).emit('player_left', { 
                    players: Array.from(room.players.values()),
                    leftPlayerId: socket.id 
                });
                checkAllReady(roomCode);
            }
        } else {
            // Mid-game: Mark as offline (Dummy status)
            player.isOnline = false;
            io.to(roomCode).emit('player_offline', socket.id);
            socket.leave(roomCode);

            // Check if room is completely abandoned
            const activePlayers = Array.from(room.players.values()).filter(p => p.isOnline);
            if (activePlayers.length === 0) {
                clearInterval(room.gameInterval);
                rooms.delete(roomCode);
                console.log(`Room ${roomCode} deleted (abandoned mid-game)`);
            }
        }
    }
};
