import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import socketManager from '../../utils/SocketManager';

export default class MatchResults extends Phaser.Scene {
    constructor() {
        super('MatchResults');
    }

    init(data) {
        this.leaderboard = data.leaderboard || [];
    }

    create() {
        const { width, height } = this.cameras.main;
        
        this.add.rectangle(0, 0, width, height, 0x0f172a, 0.9).setOrigin(0, 0);

        this.add.text(width / 2, 80, 'MATCH RESULTS', {
            font: 'bold 48px monospace',
            fill: '#fbbf24'
        }).setOrigin(0.5);

        // Leaderboard Table
        const tableY = 200;
        this.add.text(width / 2 - 200, tableY, 'PLAYER', { font: 'bold 20px monospace', fill: '#94a3b8' });
        this.add.text(width / 2 + 100, tableY, 'KILLS', { font: 'bold 20px monospace', fill: '#94a3b8' });
        this.add.text(width / 2 + 200, tableY, 'DEATHS', { font: 'bold 20px monospace', fill: '#94a3b8' });

        this.leaderboard.forEach((p, i) => {
            const y = tableY + 50 + (i * 40);
            const color = i === 0 ? '#4ade80' : '#ffffff';
            
            this.add.text(width / 2 - 200, y, `${i + 1}. ${p.name}`, { font: 'bold 18px monospace', fill: color });
            this.add.text(width / 2 + 100, y, p.kills, { font: 'bold 18px monospace', fill: color });
            this.add.text(width / 2 + 200, y, p.deaths, { font: 'bold 18px monospace', fill: color });
        });

        // Navigation
        const lobbyBtn = this.add.text(width / 2, height - 150, 'BACK TO LOBBY', {
            font: 'bold 24px monospace',
            fill: '#ffffff',
            backgroundColor: '#3b82f6',
            padding: { x: 30, y: 15 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            // Reset state for new round
            const store = useGameStore.getState();
            store.setPvPPlayers([]);
            this.scene.start('PvPLobby');
        });

        const menuBtn = this.add.text(width / 2, height - 80, 'EXIT TO MAIN MENU', {
            font: 'bold 18px monospace',
            fill: '#94a3b8'
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            socketManager.leaveRoom();
            this.scene.start('MainMenu');
        });
    }
}
