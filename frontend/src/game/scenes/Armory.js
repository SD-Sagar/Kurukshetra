import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import CharacterAssembler from '../utils/CharacterAssembler';

export default class Armory extends Phaser.Scene {
    constructor() {
        super('Armory');
    }

    create() {
        const { width, height } = this.cameras.main;
        const store = useGameStore.getState();

        this.add.rectangle(0, 0, width, height, 0x1e293b).setOrigin(0, 0);
        this.add.text(width / 2, 50, 'ARMORY - SELECT LOADOUT', {
            font: 'bold 32px monospace',
            fill: '#fbbf24'
        }).setOrigin(0.5);

        // Preview Character
        this.playerPreview = new CharacterAssembler(this, { type: 'player' });
        this.playerPreview.container.setPosition(200, height / 2 + 50);
        this.playerPreview.container.setScale(1);

        // Weapon Options
        const weapons = [
            { key: 'pistol', name: 'PISTOL', color: '#4ade80' },
            { key: 'smg', name: 'SMG', color: '#3b82f6' },
            { key: 'rifle', name: 'RIFLE', color: '#facc15' },
            { key: 'shotgun', name: 'SHOTGUN', color: '#8b5cf6' }
        ];

        this.selected = store.selectedWeapons[0];

        weapons.forEach((wp, i) => {
            const btn = this.add.text(width - 300, 150 + (i * 60), wp.name, {
                font: 'bold 20px monospace',
                fill: this.selected === wp.key ? '#ffffff' : wp.color,
                backgroundColor: this.selected === wp.key ? wp.color : '#0f172a',
                padding: { x: 20, y: 10 }
            })
            .setOrigin(0, 0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.selected = wp.key;
                store.setSelectedWeapons([wp.key, null]);
                this.scene.restart();
            });
        });

        // Deploy Button
        const deployBtn = this.add.text(width / 2, height - 80, 'DEPLOY TO BATTLEFIELD', {
            font: 'bold 28px monospace',
            fill: '#ffffff',
            backgroundColor: '#ef4444',
            padding: { x: 40, y: 15 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => deployBtn.setScale(1.1))
        .on('pointerout', () => deployBtn.setScale(1))
        .on('pointerdown', () => this.deploy());

        // Visual feedback for selected weapon
        const weaponColors = {
            pistol: 0x4ade80,
            smg: 0x3b82f6,
            rifle: 0xfacc15,
            shotgun: 0x8b5cf6
        };
        this.playerPreview.update(0, 16, 0, false, weaponColors[this.selected]);
        this.playerPreview.aimAt(width, height / 2);
    }

    deploy() {
        const store = useGameStore.getState();
        const isRegistered = !!store.userProfile;
        const isNewGame = store.isNewGame;

        if (isNewGame || (!isRegistered)) {
            // New Game or Guest Continue -> Intro
            this.scene.start('Scene1_Breach');
        } else {
            // Registered + Continue Solo -> Skip to MainGame
            this.scene.start('MainGame');
        }
    }
}
