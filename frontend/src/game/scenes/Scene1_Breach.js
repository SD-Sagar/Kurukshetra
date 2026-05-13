import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';

export default class Scene1_Breach extends Phaser.Scene {
    constructor() {
        super('Scene1_Breach');
    }

    create() {
        // Hide HUD for cinematic experience
        useGameStore.getState().setShowHUD(false);
        const { width, height } = this.cameras.main;

        // 1. Black Background
        this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0, 0);

        // 2. Initialize Video
        this.video = this.add.video(width / 2, height / 2, 'breach_video');
        
        // Use a listener to set size once video is ready (Fixes the extreme zoom bug)
        this.video.on('play', () => {
            this.video.setDisplaySize(width, height);
        });
        
        this.video.play();

        // 3. Skip Option (Gaming Way)
        this.skipText = this.add.text(width - 50, height - 50, '[ CLICK TO SKIP ]', {
            font: 'bold 18px monospace',
            fill: '#00FF00',
            backgroundColor: '#000000AA',
            padding: { x: 10, y: 5 }
        }).setOrigin(1, 1).setAlpha(0).setDepth(100);

        // Fade in skip option after 3 seconds
        this.time.delayedCall(3000, () => {
            this.tweens.add({
                targets: this.skipText,
                alpha: 0.7,
                duration: 1000
            });
        });

        // 4. Input Handling for Skip
        this.input.on('pointerdown', () => {
            this.finishCinematic();
        });

        // Keyboard skip
        this.input.keyboard.on('keydown', () => {
            this.finishCinematic();
        });

        // 5. Handle Video End
        this.video.on('complete', () => {
            this.finishCinematic();
        });
    }

    finishCinematic() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        // Stop video playback
        if (this.video) {
            this.video.stop();
        }

        // Smooth fade to next scene
        this.cameras.main.fade(1000, 0, 0, 0, false, (camera, progress) => {
            if (progress === 1) {
                this.scene.start('Scene2_Recruitment');
            }
        });
    }
}
