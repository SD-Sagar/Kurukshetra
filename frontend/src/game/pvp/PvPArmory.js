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
        const infoBox = this.add.container(width / 2 + 100, height / 2 - 50);
        const bg = this.add.rectangle(0, 0, 400, 150, 0x000000, 0.4).setOrigin(0.5);
        const infoText = this.add.text(0, 0, "LOADOUT: PISTOL & DAGGER\n\nTo change your soldier's look,\nplease use the SOLO ARMORY.\n\nYour appearance choices will\nsync here automatically.", {
            font: 'bold 18px monospace',
            fill: '#4ade80',
            align: 'center'
        }).setOrigin(0.5);
        infoBox.add([bg, infoText]);

        // Force preview to Pistol for consistency

        // Force preview to Pistol for consistency
        this.playerPreview.update(0, 16, 0, false, 'pistol');
        this.playerPreview.aimAt(width, height / 2);
    }
}
