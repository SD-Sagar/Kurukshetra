import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import CharacterAssembler from '../utils/CharacterAssembler';

export default class Armory extends Phaser.Scene {
    constructor() {
        super('Armory');
    }

    init(data) {
        this.activeTab = data?.tab || 'weapons';
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

        // Tabs (activeTab set in init)
        const tabStyle = { font: 'bold 20px monospace', fill: '#ffffff', backgroundColor: '#334155', padding: { x: 20, y: 10 } };
        const activeTabStyle = { ...tabStyle, backgroundColor: '#fbbf24', fill: '#000000' };

        const weaponTabBtn = this.add.text(width - 300, 100, 'WEAPONS', this.activeTab === 'weapons' ? activeTabStyle : tabStyle)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.activeTab = 'weapons';
                this.scene.restart();
            });

        const appearanceTabBtn = this.add.text(width - 150, 100, 'APPEARANCE', this.activeTab === 'appearance' ? activeTabStyle : tabStyle)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.activeTab = 'appearance';
                // We'll use a property to persist tab state across restarts if needed, 
                // but for now let's just use a local scene variable
                this.scene.start('Armory', { tab: 'appearance' });
            });

        if (this.activeTab === 'weapons') {
            const weapons = [
                { key: 'pistol', name: 'PISTOL', color: '#4ade80' },
                { key: 'smg', name: 'SMG', color: '#3b82f6' },
                { key: 'rifle', name: 'RIFLE', color: '#facc15' },
                { key: 'shotgun', name: 'SHOTGUN', color: '#8b5cf6' }
            ];

            this.selected = store.selectedWeapons[0];

            weapons.forEach((wp, i) => {
                const btn = this.add.text(width - 300, 180 + (i * 60), wp.name, {
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
        } else {
            // Appearance Selection
            const options = [
                { label: 'HEAD', key: 'head', values: ['male', 'Commando', 'Indiancaptain', 'Indiancommando', 'Indiancommando2', 'Ops', 'Soldire', 'Spetnaz', 'Spetnaz2', 'Terrorist'] },
                { label: 'BODY', key: 'torso', values: ['male', 'Commando', 'Indiancommando', 'Indiancommando2', 'Ops', 'Soldire', 'Spetnaz2', 'Terrorist'] },
                { label: 'ARMS', key: 'arms', values: ['male', 'commando', 'navy', 'soldire', 'spetnaz'] },
                { label: 'LEGS', key: 'legs', values: ['male', 'Commando', 'Indiancommando', 'Ops', 'Soldire', 'Spetnaz', 'Spetnaz2', 'Terrorist'] }
            ];

            options.forEach((opt, i) => {
                this.add.text(width - 300, 150 + (i * 70), opt.label, { font: 'bold 16px monospace', fill: '#94a3b8' });
                
                const currentVal = store.appearance[opt.key];
                const displayVal = (currentVal || '').toUpperCase();

                const btn = this.add.text(width - 300, 175 + (i * 70), `< ${displayVal} >`, {
                    font: 'bold 20px monospace',
                    fill: '#ffffff',
                    backgroundColor: '#1e293b',
                    padding: { x: 15, y: 8 }
                })
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', () => {
                    const currentIndex = opt.values.indexOf(currentVal);
                    const nextIndex = (currentIndex + 1) % opt.values.length;
                    const nextVal = opt.values[nextIndex];
                    
                    // Update specific part
                    store.setAppearance({ [opt.key]: nextVal });
                    
                    // Small logic: If changing torso, try to auto-match arms if names are close
                    if (opt.key === 'torso') {
                        const armMatch = nextVal.toLowerCase();
                        if (['commando', 'soldire', 'spetnaz'].includes(armMatch)) {
                            store.setAppearance({ arms: armMatch });
                        }
                    }

                    this.playerPreview.refreshTextures();
                    this.scene.restart({ tab: 'appearance' });
                });
            });
        }

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
