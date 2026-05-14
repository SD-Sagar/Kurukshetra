import { io } from 'socket.io-client';

class SocketManager {
    constructor() {
        this.socket = null;
        this.roomCode = null;
        this.isHost = false;
        this.matchTime = 300;
        this.listeners = new Map();
    }

    connect(serverUrl = 'http://localhost:5000') {
        if (this.socket) return;
        
        this.socket = io(serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to PvP Server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from PvP Server');
        });

        this.socket.on('error_message', (msg) => {
            alert(msg);
        });

        // Initialize internal listeners
        this._setupDefaultListeners();
    }

    _setupDefaultListeners() {
        // This will propagate server events to the game scenes
        const events = [
            'room_created', 'player_joined', 'player_left', 'player_offline',
            'ready_status_updated', 'countdown_tick', 'countdown_cancelled',
            'match_started', 'timer_tick', 'match_ended', 'kill_announcement',
            'remote_player_update', 'new_admin', 'match_in_progress', 'match_timer_updated',
            'player_fire', 'player_hit', 'loot_picked_up', 'loot_sync'
        ];

        events.forEach(event => {
            this.socket.on(event, (data) => {
                // Internal state sync
                if (event === 'room_created') {
                    this.roomCode = data.roomCode;
                    this.isHost = true;
                } else if (event === 'player_joined' && !this.roomCode) {
                    // This handles the case where we joined but haven't saved the code
                    // though joinRoom usually sets it.
                } else if (event === 'new_admin') {
                    this.isHost = data === this.socket.id;
                }

                const callbacks = this.listeners.get(event) || [];
                callbacks.forEach(cb => cb(data));
            });
        });
    }

    // --- Actions ---

    createRoom(playerData) {
        this.socket.emit('create_room', playerData);
        this.isHost = true;
    }

    joinRoom(roomCode, playerData) {
        this.roomCode = roomCode;
        this.socket.emit('join_room', { roomCode, playerData });
        this.isHost = false;
    }

    leaveRoom() {
        if (this.roomCode) {
            this.socket.emit('leave_room', { roomCode: this.roomCode });
            this.roomCode = null;
        }
    }

    toggleReady() {
        if (this.roomCode) {
            this.socket.emit('toggle_ready', { roomCode: this.roomCode });
        }
    }

    setMatchTimer(minutes) {
        if (this.roomCode && this.isHost) {
            this.socket.emit('set_match_timer', { roomCode: this.roomCode, durationMinutes: minutes });
        }
    }

    sendUpdate(transform) {
        if (this.roomCode) {
            this.socket.emit('player_update', { roomCode: this.roomCode, transform });
        }
    }

    sendHit(victimId, damage) {
        if (this.roomCode) {
            this.socket.emit('player_hit', { roomCode: this.roomCode, victimId, damage });
        }
    }

    sendDeath(killerId = null) {
        if (this.roomCode) {
            this.socket.emit('player_death', { roomCode: this.roomCode, killerId });
        }
    }

    sendFire(angle, weapon) {
        if (this.roomCode) {
            this.socket.emit('player_fire', { roomCode: this.roomCode, angle, weapon });
        }
    }

    sendLootPickup(index) {
        if (this.roomCode) {
            this.socket.emit('player_loot_pickup', { roomCode: this.roomCode, index });
        }
    }

    sendLootSync(lootMap) {
        if (this.roomCode) {
            this.socket.emit('player_loot_sync', { roomCode: this.roomCode, lootMap });
        }
    }

    // --- Scene Logic ---

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }
}

const socketManager = new SocketManager();
export default socketManager;
