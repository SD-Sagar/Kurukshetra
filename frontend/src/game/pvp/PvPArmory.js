import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import { usePvPStore } from '../../store/pvpStore';
import CharacterAssembler from '../utils/CharacterAssembler';

export default class PvPArmory extends Phaser.Scene {
    constructor() {
        super('PvPArmory');
    }

    create() {
        const { width, height } = this.cameras.main;
        const store = useGameStore.getState();

        this.add.rectangle(0, 0, width, height, 0x1e293b).setOrigin(0, 0);
        
        // Back Button
        this.add.text(50, 50, '< BACK TO LOBBY', {
            font: 'bold 18px monospace',
            fill: '#94a3b8'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start('PvPLobby'));

        this.add.text(width / 2, 50, 'MULTIPLAYER ARMORY', {
            font: 'bold 32px monospace',
            fill: '#fbbf24'
        }).setOrigin(0.5);

        // Preview Character
        this.playerPreview = new CharacterAssembler(this, { type: 'player' });
        this.playerPreview.container.setPosition(200, height / 2 + 50);
        this.playerPreview.container.setScale(1);

        // Weapon Restriction Info
        const infoBox = this.add.container(width - 400, 100);
        const bg = this.add.rectangle(0, 0, 350, 100, 0x000000, 0.4).setOrigin(0);
        const infoText = this.add.text(10, 10, "STANDARD LOADOUT LOCKED:\nPISTOL & DAGGER\n\nCustomizing Avatar...", {
            font: 'bold 16px monospace',
            fill: '#4ade80'
        });
        infoBox.add([bg, infoText]);

        // Appearance Selection (Same as solo but updates pvp profile)
        const options = [
            { label: 'HEAD', key: 'head', values: ['Commando', 'Indiancaptain', 'Indiancommando', 'Indiancommando2', 'Ops', 'Soldire', 'Spetnaz', 'Spetnaz2', 'Terrorist'] },
            { label: 'BODY', key: 'torso', values: ['Commando', 'Indiancommando', 'Indiancommando2', 'Ops', 'Soldire', 'Spetnaz2', 'Terrorist'] },
            { label: 'ARMS', key: 'arms', values: ['commando', 'navy', 'soldire', 'spetnaz'] },
            { label: 'LEGS', key: 'legs', values: ['Commando', 'Indiancommando', 'Ops', 'Soldire', 'Spetnaz', 'Spetnaz2', 'Terrorist'] }
        ];

        options.forEach((opt, i) => {
            this.add.text(width - 300, 220 + (i * 70), opt.label, { font: 'bold 16px monospace', fill: '#94a3b8' });
            
            const currentVal = store.appearance[opt.key];
            const currentIndex = opt.values.indexOf(currentVal);

            const btn = this.add.text(width - 300, 245 + (i * 70), `< MODEL ${currentIndex + 1} >`, {
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

        // Force preview to Pistol for consistency
        this.playerPreview.update(0, 16, 0, false, 'pistol');
        this.playerPreview.aimAt(width, height / 2);
    }
}
