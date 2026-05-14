import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import CharacterAssembler from '../utils/CharacterAssembler';
import socketManager from '../../utils/SocketManager';

export default class PvPArmory extends Phaser.Scene {
    constructor() {
        super('PvPArmory');
    }

    create() {
        useGameStore.getState().setShowHUD(false);
        const { width, height } = this.cameras.main;
        const store = useGameStore.getState();

        // Connect to Socket
        socketManager.connect();
        store.setGameMode('PVP');

        this.add.rectangle(0, 0, width, height, 0x0f172a).setOrigin(0, 0);
        
        // Back Button
        this.add.text(50, 50, '< BACK TO MENU', {
            font: 'bold 18px monospace',
            fill: '#94a3b8'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            socketManager.leaveRoom();
            this.scene.start('MainMenu');
        });

        this.add.text(width / 2, 50, 'MULTIPLAYER ARMORY - PvP', {
            font: 'bold 32px monospace',
            fill: '#22d3ee'
        }).setOrigin(0.5);

        // Preview Character
        this.playerPreview = new CharacterAssembler(this, { type: 'player' });
        this.playerPreview.container.setPosition(200, height / 2 + 50);
        this.playerPreview.container.setScale(1);
        this.playerPreview.update(0, 16, 0, false, 'pistol'); // Forced to pistol for PvP

        // Customization UI
        this.createCustomizationUI(width, height, store);

        // Multiplayer Controls
        this.createMultiplayerUI(width, height, store);

        // Socket Listeners
        this.onRoomCreated = (data) => {
            store.setRoomCode(data.roomCode);
            store.setIsHost(true);
            store.setHostId(data.adminId);
            store.setPvPPlayers(data.players);
            this.scene.start('PvPLobby');
        };

        this.onPlayerJoined = (data) => {
            // If we are the one who just joined, set up our room state
            if (data.newPlayer.id === socketManager.socket.id) {
                store.setRoomCode(socketManager.roomCode);
                store.setHostId(data.adminId);
                store.setIsHost(false);
                store.setPvPPlayers(data.players);
                this.scene.start('PvPLobby');
            } else {
                // Someone else joined, we are likely already in the lobby
                // but if we were stuck in armory for some reason, update
                store.setPvPPlayers(data.players);
            }
        };

        this.onMatchInProgress = (data) => {
            store.setRoomCode(socketManager.roomCode);
            store.setPvPPlayers(data.players);
            store.setIsHost(false);
            this.scene.start('PvPLobby', { matchInProgress: data });
        };

        socketManager.on('room_created', this.onRoomCreated);
        socketManager.on('player_joined', this.onPlayerJoined);
        socketManager.on('match_in_progress', this.onMatchInProgress);

        // Cleanup on shutdown
        this.events.once('shutdown', () => {
            socketManager.off('room_created', this.onRoomCreated);
            socketManager.off('player_joined', this.onPlayerJoined);
            socketManager.off('match_in_progress', this.onMatchInProgress);
        });
    }

    createCustomizationUI(width, height, store) {
        const options = [
            { label: 'HEAD', key: 'head', values: ['Commando', 'Indiancaptain', 'Indiancommando', 'Indiancommando2', 'Ops', 'Soldire', 'Spetnaz', 'Spetnaz2', 'Terrorist'] },
            { label: 'BODY', key: 'torso', values: ['Commando', 'Indiancommando', 'Indiancommando2', 'Ops', 'Soldire', 'Spetnaz2', 'Terrorist'] },
            { label: 'ARMS', key: 'arms', values: ['commando', 'navy', 'soldire', 'spetnaz'] },
            { label: 'LEGS', key: 'legs', values: ['Commando', 'Indiancommando', 'Ops', 'Soldire', 'Spetnaz', 'Spetnaz2', 'Terrorist'] }
        ];

        options.forEach((opt, i) => {
            this.add.text(width - 350, 150 + (i * 70), opt.label, { font: 'bold 16px monospace', fill: '#94a3b8' });
            
            const currentVal = store.appearance[opt.key];
            const currentIndex = opt.values.indexOf(currentVal);
            const displayIndex = currentIndex + 1;

            const btn = this.add.text(width - 350, 175 + (i * 70), `< MODEL ${displayIndex} >`, {
                font: 'bold 20px monospace',
                fill: '#ffffff',
                backgroundColor: '#1e293b',
                padding: { x: 15, y: 8 }
            })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', async () => {
                const freshStore = useGameStore.getState();
                const currentValNow = freshStore.appearance[opt.key];
                const currentIndexNow = opt.values.indexOf(currentValNow);

                const nextIndex = (currentIndexNow + 1) % opt.values.length;
                const nextVal = opt.values[nextIndex];
                
                await store.setAppearance({ [opt.key]: nextVal });
                
                if (opt.key === 'torso') {
                    const armMatch = nextVal.toLowerCase();
                    if (['commando', 'soldire', 'spetnaz'].includes(armMatch)) {
                        await store.setAppearance({ arms: armMatch });
                    }
                }

                this.playerPreview.refreshTextures();
                btn.setText(`< MODEL ${nextIndex + 1} >`);
            });
        });
    }

    createMultiplayerUI(width, height, store) {
        // Create Room Button
        const createBtn = this.add.text(width / 2, height - 150, 'CREATE ROOM', {
            font: 'bold 24px monospace',
            fill: '#ffffff',
            backgroundColor: '#4ade80',
            padding: { x: 30, y: 15 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            socketManager.createRoom({
                name: store.userProfile?.username || 'Soldier',
                avatar: store.appearance
            });
        });

        // Join Room UI
        this.add.text(width / 2, height - 80, 'OR ENTER ROOM CODE:', {
            font: '16px monospace',
            fill: '#94a3b8'
        }).setOrigin(0.5);

        // Simple prompt for now, could be improved with a real input field
        const joinBtn = this.add.text(width / 2, height - 40, '[ JOIN ROOM ]', {
            font: 'bold 24px monospace',
            fill: '#fbbf24'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            const code = prompt("Enter 4-digit Room Code:");
            if (code) {
                socketManager.joinRoom(code.toUpperCase(), {
                    name: store.userProfile?.username || 'Soldier',
                    avatar: store.appearance
                });
            }
        });
    }
}
