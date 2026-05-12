import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';

export default class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        useGameStore.getState().setShowHUD(false);
        const { width, height } = this.cameras.main;

        // Background
        this.add.rectangle(0, 0, width, height, 0x0f172a).setOrigin(0, 0);
        
        // Title
        this.add.text(width / 2, 100, 'SD-DAY: SYNC PROTOCOL', {
            font: 'bold 48px monospace',
            fill: '#22d3ee'
        }).setOrigin(0.5);

        const options = [
            { text: 'NEW GAME', action: () => this.startNewGame() },
            { text: 'CONTINUE SOLO', action: () => this.continueSolo() },
            { text: 'CO-OP (COMING SOON)', action: () => {}, color: '#64748b' },
            { text: 'EXIT', action: () => this.exitGame(), color: '#ef4444' }
        ];

        options.forEach((opt, i) => {
            const btn = this.add.text(width / 2, 250 + (i * 70), opt.text, {
                font: 'bold 24px monospace',
                fill: opt.color || '#ffffff',
                backgroundColor: '#1e293b',
                padding: { x: 20, y: 10 }
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => btn.setStyle({ fill: '#fbbf24' }))
            .on('pointerout', () => btn.setStyle({ fill: opt.color || '#ffffff' }))
            .on('pointerdown', opt.action);
        });
    }

    startNewGame() {
        useGameStore.getState().setIsNewGame(true);
        this.scene.start('Armory');
    }

    continueSolo() {
        useGameStore.getState().setIsNewGame(false);
        this.scene.start('Armory');
    }

    exitGame() {
        // In a real app, this would route back to /login
        window.location.href = '/login';
    }
}
