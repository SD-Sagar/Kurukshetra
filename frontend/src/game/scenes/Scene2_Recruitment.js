import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import CharacterAssembler from '../utils/CharacterAssembler';

export default class Scene2_Recruitment extends Phaser.Scene {
    constructor() {
        super('Scene2_Recruitment');
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Background: Cave Floor (Side View)
        this.add.rectangle(0, 0, width, height, 0x050505).setOrigin(0, 0); // Dark cave
        this.add.rectangle(0, height - 100, width, 100, 0x1A1A1A).setOrigin(0, 0); // Floor
        
        // Add dust falling effect
        this.dustParticles = this.add.particles(0, -50, 'dust', {
            x: { min: 0, max: width },
            y: 0,
            speedY: { min: 20, max: 50 },
            lifespan: 5000,
            scale: { start: 2, end: 0 },
            alpha: { start: 0.5, end: 0 },
            frequency: 100,
            tint: 0x555555
        });

        // Sarge Modular Assembly (Full Body)
        this.sarge = new CharacterAssembler(this, { type: 'sarge' });
        this.sarge.container.setPosition(-200, height - 130); 
        
        // Player Modular Assembly (Full Body - Lying down)
        this.player = new CharacterAssembler(this, { type: 'player' });
        this.player.container.setPosition(width / 2 + 100, height - 110);
        this.player.container.setAngle(-90); // Lying on floor
        this.player.head.setTexture('player_head_shock');

        // Dialogue System (Pinned to Sarge)
        this.bubble = this.add.graphics();
        this.bubble.fillStyle(0x000000, 0.7); // Dark background for contrast
        this.bubble.lineStyle(2, 0xFFFFFF, 1); // White border
        this.bubble.fillRoundedRect(-150, -250, 300, 80, 15);
        this.bubble.strokeRoundedRect(-150, -250, 300, 80, 15);

        this.username = useGameStore.getState().userProfile?.username || 'Recruit';
        this.dialogueText = this.add.text(0, -210, '', {
            font: 'bold 16px monospace',
            fill: '#FFFFFF',
            align: 'center',
            wordWrap: { width: 280 }
        }).setOrigin(0.5, 0.5);

        // Group bubble and text
        this.speechContainer = this.add.container(0, 0, [this.bubble, this.dialogueText]);
        this.speechContainer.setAlpha(0);
        this.speechContainer.setDepth(2000); // Super high depth

        // Sequence
        this.time.delayedCall(1000, this.sargeEnters, [], this);
    }

    sargeEnters() {
        // Sarge walks to center
        this.tweens.add({
            targets: this.sarge.container,
            x: this.cameras.main.width / 2 - 80,
            duration: 2500,
            ease: 'Power1',
            onUpdate: () => {
                this.sarge.update(0, 16, 100); 
            },
            onComplete: () => {
                this.sarge.update(0, 16, 0); 
                this.sarge.head.setTexture('sarge_head_focus');
                this.time.delayedCall(800, () => {
                    this.showDialogue(`Wake up, ${this.username}. The world is burning... and you're the only pilot left standing.`, () => {
                        this.time.delayedCall(4000, this.offerHand, [], this);
                    });
                });
            }
        });
    }

    showDialogue(text, onComplete) {
        this.dialogueText.setText(text);
        this.speechContainer.setAlpha(1);
        this.speechContainer.setPosition(this.sarge.container.x, this.sarge.container.y);
        
        // Simple pop-in animation
        this.speechContainer.setScale(0);
        this.tweens.add({
            targets: this.speechContainer,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: onComplete
        });
    }

    hideDialogue(onComplete) {
        this.tweens.add({
            targets: this.speechContainer,
            alpha: 0,
            duration: 300,
            onComplete: onComplete
        });
    }

    offerHand() {
        // Sarge leans down a bit and offers hand
        this.tweens.add({
            targets: this.sarge.armFront,
            angle: 45,
            duration: 1000,
            onComplete: () => {
                this.time.delayedCall(1000, () => {
                    this.pullPlayerUp();
                });
            }
        });
    }

    pullPlayerUp() {
        this.hideDialogue();

        // Player stands up
        this.tweens.add({
            targets: this.player.container,
            angle: 0,
            y: this.cameras.main.height - 130,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.player.head.setTexture('player_head'); // Back to normal
                this.time.delayedCall(1000, this.finishScene, [], this);
            }
        });
    }

    finishScene() {
        this.showDialogue("Let's see if you still know how to fly.", () => {
            this.time.delayedCall(2000, () => {
                this.cameras.main.fade(1000, 0, 0, 0, false, (cam, progress) => {
                    if (progress === 1) {
                        this.scene.start('MainGame');
                    }
                });
            });
        });
    }

    handoverJetpack() {
        this.tweens.add({
            targets: this.jetpack,
            alpha: 1,
            x: this.player2D.x - 10,
            duration: 800,
            onComplete: () => {
                this.time.delayedCall(500, () => {
                    this.showDialogue("Let's see if you still know how to fly.", () => {
                        this.time.delayedCall(2000, () => {
                            this.cameras.main.fade(800, 0, 0, 0, false, (cam, progress) => {
                                if (progress === 1) {
                                    this.scene.start('MainGame');
                                }
                            });
                        });
                    });
                });
            }
        });
    }
}
