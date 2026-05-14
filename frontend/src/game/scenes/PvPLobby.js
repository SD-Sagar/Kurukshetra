import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import socketManager from '../../utils/SocketManager';
import CharacterAssembler from '../utils/CharacterAssembler';

export default class PvPLobby extends Phaser.Scene {
    constructor() {
        super('PvPLobby');
    }

    init(data) {
        this.startData = data || {};
    }

    create() {
        const { width, height } = this.cameras.main;
        const store = useGameStore.getState();

        if (this.startData.matchInProgress) {
            this.time.delayedCall(100, () => {
                this.showMatchInProgress(width, height, this.startData.matchInProgress);
            });
        }

        this.add.rectangle(0, 0, width, height, 0x0f172a).setOrigin(0, 0);

        // Header
        this.add.text(width / 2, 50, `ROOM CODE: ${store.roomCode}`, {
            font: 'bold 36px monospace',
            fill: '#fbbf24'
        }).setOrigin(0.5);

        // Player List Container
        this.playerListContainer = this.add.container(width / 2, 150);
        this.refreshPlayerList();

        // Match Settings (Admin Only)
        if (store.hostId === socketManager.socket.id) {
            this.createAdminSettings(width, height, store);
        }

        // Ready Button
        this.readyBtn = this.add.text(width / 2, height - 100, 'READY', {
            font: 'bold 28px monospace',
            fill: '#ffffff',
            backgroundColor: '#ef4444',
            padding: { x: 40, y: 15 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => socketManager.toggleReady());

        // Countdown Text
        this.countdownText = this.add.text(width / 2, height / 2, '', {
            font: 'bold 120px monospace',
            fill: '#22d3ee'
        }).setOrigin(0.5).setAlpha(0);

        // Socket Listeners
        this.onReadyStatusUpdated = (players) => {
            store.setPvPPlayers(players);
            this.refreshPlayerList();
            const me = players.find(p => p.id === socketManager.socket.id);
            if (me) {
                this.readyBtn.setText(me.isReady ? 'UNREADY' : 'READY');
                this.readyBtn.setBackgroundColor(me.isReady ? '#4ade80' : '#ef4444');
            }
        };

        this.onCountdownTick = (count) => {
            this.countdownText.setAlpha(1).setText(count);
            if (count < 4) {
                this.readyBtn.setAlpha(0.5).disableInteractive();
                this.readyBtn.setText('LOCKED');
            }
        };

        this.onCountdownCancelled = () => {
            this.countdownText.setAlpha(0);
            this.readyBtn.setAlpha(1).setInteractive();
            this.readyBtn.setText('READY');
        };

        this.onMatchStarted = (data) => {
            this.scene.start('MainGame', { 
                gameMode: 'PVP',
                lootMap: data ? data.lootMap : null 
            });
        };

        this.onPlayerJoined = (data) => {
            store.setPvPPlayers(data.players);
            if (data.adminId) store.setHostId(data.adminId);
            this.refreshPlayerList();
        };

        this.onPlayerLeft = (data) => {
            store.setPvPPlayers(data.players);
            this.refreshPlayerList();
        };

        this.onNewAdmin = (adminId) => {
            store.setHostId(adminId);
            const isMe = adminId === socketManager.socket.id;
            store.setIsHost(isMe);
            if (isMe && !this.timerDisplay) {
                this.createAdminSettings(width, height, store);
            }
            this.refreshPlayerList();
        };

        this.onMatchTimerUpdated = (minutes) => {
            store.setMatchTimer(minutes * 60);
            if (this.timerDisplay) this.timerDisplay.setText(`TIME: ${minutes}m`);
        };

        this.onMatchInProgress = (data) => this.showMatchInProgress(width, height, data);

        socketManager.on('ready_status_updated', this.onReadyStatusUpdated);
        socketManager.on('countdown_tick', this.onCountdownTick);
        socketManager.on('countdown_cancelled', this.onCountdownCancelled);
        socketManager.on('match_started', this.onMatchStarted);
        socketManager.on('player_joined', this.onPlayerJoined);
        socketManager.on('player_left', this.onPlayerLeft);
        socketManager.on('new_admin', this.onNewAdmin);
        socketManager.on('match_timer_updated', this.onMatchTimerUpdated);
        socketManager.on('match_in_progress', this.onMatchInProgress);

        this.events.once('shutdown', () => {
            socketManager.off('ready_status_updated', this.onReadyStatusUpdated);
            socketManager.off('countdown_tick', this.onCountdownTick);
            socketManager.off('countdown_cancelled', this.onCountdownCancelled);
            socketManager.off('match_started', this.onMatchStarted);
            socketManager.off('player_joined', this.onPlayerJoined);
            socketManager.off('player_left', this.onPlayerLeft);
            socketManager.off('new_admin', this.onNewAdmin);
            socketManager.off('match_timer_updated', this.onMatchTimerUpdated);
            socketManager.off('match_in_progress', this.onMatchInProgress);
        });
    }

    refreshPlayerList() {
        const store = useGameStore.getState();
        this.playerListContainer.removeAll(true);

        store.pvpPlayers.forEach((player, i) => {
            const xOffset = (i - (store.pvpPlayers.length - 1) / 2) * 200;
            const card = this.add.container(xOffset, 150);

            // Avatar Preview
            const preview = new CharacterAssembler(this, { type: 'player', appearance: player.avatar });
            preview.container.setScale(0.6);
            
            const nameText = this.add.text(0, 80, player.name, {
                font: 'bold 16px monospace',
                fill: '#ffffff'
            }).setOrigin(0.5);

            const statusText = this.add.text(0, 105, player.isReady ? 'READY' : 'WAITING', {
                font: 'bold 14px monospace',
                fill: player.isReady ? '#4ade80' : '#94a3b8'
            }).setOrigin(0.5);

            if (player.id === store.hostId) {
                const adminBadge = this.add.text(0, -100, 'ADMIN', {
                    font: 'bold 10px monospace',
                    fill: '#fbbf24',
                    backgroundColor: '#000000',
                    padding: { x: 5, y: 2 }
                }).setOrigin(0.5);
                card.add(adminBadge);
            }

            card.add([preview.container, nameText, statusText]);
            this.playerListContainer.add(card);
        });
    }

    createAdminSettings(width, height, store) {
        const options = [5, 10, 20, 30];
        this.add.text(width / 2, height - 200, 'MATCH DURATION (MINS)', {
            font: 'bold 14px monospace',
            fill: '#94a3b8'
        }).setOrigin(0.5);

        this.timerDisplay = this.add.text(width / 2, height - 170, `TIME: ${store.matchTimer / 60}m`, {
            font: 'bold 20px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5);

        options.forEach((opt, i) => {
            const x = (width / 2 - 120) + (i * 80);
            this.add.text(x, height - 140, `${opt}`, {
                font: 'bold 16px monospace',
                fill: '#ffffff',
                backgroundColor: '#1e293b',
                padding: { x: 10, y: 5 }
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => socketManager.setMatchTimer(opt));
        });
    }

    showMatchInProgress(width, height, data) {
        // Overlay for re-joiners
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setOrigin(0);
        this.add.text(width / 2, height / 2 - 50, 'MATCH IN PROGRESS', {
            font: 'bold 48px monospace',
            fill: '#ef4444'
        }).setOrigin(0.5);

        this.waitTimer = this.add.text(width / 2, height / 2 + 20, 'PLEASE WAIT FOR NEXT ROUND...', {
            font: '20px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5);

        socketManager.on('timer_tick', (timeLeft) => {
            const mins = Math.floor(timeLeft / 60);
            const secs = timeLeft % 60;
            this.waitTimer.setText(`ESTIMATED WAIT: ${mins}:${secs < 10 ? '0' : ''}${secs}`);
        });

        this.readyBtn.setVisible(false);
    }
}
