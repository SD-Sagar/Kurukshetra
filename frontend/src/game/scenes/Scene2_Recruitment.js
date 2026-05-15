import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';
import CharacterAssembler from '../utils/CharacterAssembler';

export default class Scene2_Recruitment extends Phaser.Scene {
    constructor() {
        super('Scene2_Recruitment');
    }

    create() {
        useGameStore.getState().setShowHUD(false);
        const { width, height } = this.cameras.main;
        
        // 1. Initialize Tilemap
        const map = this.make.tilemap({ key: 'recruitment_map' });
        const tileset = map.addTilesetImage('recruit-scene', 'tileset_recruit');
        
        // Create Layers
        const bgLayer = map.createLayer('Background', tileset, 0, 0);
        const floorLayer = map.createLayer('Floor', tileset, 0, 0);
        floorLayer.setCollisionByProperty({ collides: true });
        floorLayer.setCollisionBetween(1, 9999); // Force all tiles to be solid
        const decorLayer = map.createLayer('Decor', tileset, 0, 0);

        // 2. Fetch Spawn Points from Object Layer
        const objLayer = map.getObjectLayer('Objects');
        let sargeStart = { x: -200, y: height - 130 };
        let playerStart = { x: width / 2 + 100, y: height - 110 };

        if (objLayer) {
            objLayer.objects.forEach(obj => {
                if (obj.name === 'sarge_spawn') sargeStart = { x: obj.x, y: obj.y };
                if (obj.name === 'player_spawn') playerStart = { x: obj.x, y: obj.y };
            });
        }

        // 3. Assemble Characters with Cinematic Physics
        this.sarge = new CharacterAssembler(this, { type: 'sarge' });
        this.sarge.container.setPosition(sargeStart.x, sargeStart.y);
        this.sarge.container.setDepth(10);
        
        // Add Physics to Sarge
        this.physics.add.existing(this.sarge.container);
        this.sarge.container.body.setSize(60, 140);
        this.sarge.container.body.setOffset(-30, -70); // Adjust to feet level
        this.physics.add.collider(this.sarge.container, floorLayer);
        
        this.player = new CharacterAssembler(this, { type: 'player' });
        this.player.container.setPosition(playerStart.x, playerStart.y);
        this.player.container.setAngle(-90); // Lying on floor
        this.player.container.setDepth(10);
        this.player.setExpression('shock');

        // Add Physics to Player (Horizontal Hitbox for lying down)
        this.physics.add.existing(this.player.container);
        this.player.container.body.setSize(140, 60);
        this.player.container.body.setOffset(-70, -30);
        this.physics.add.collider(this.player.container, floorLayer);

        // Dialogue System (Pinned to Sarge)
        this.bubble = this.add.graphics();
        this.bubble.fillStyle(0x000000, 0.7); // Dark background for contrast
        this.bubble.lineStyle(2, 0xFFFFFF, 1); // White border
        this.bubble.fillRoundedRect(-150, -180, 300, 80, 15);
        this.bubble.strokeRoundedRect(-150, -180, 300, 80, 15);

        this.username = useGameStore.getState().userProfile?.username || 'Recruit';
        this.dialogueText = this.add.text(0, -140, '', {
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
                this.sarge.setExpression('focus');
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

        // Update physics body to Standing (Vertical)
        if (this.player.container.body) {
            this.player.container.body.setSize(60, 140);
            this.player.container.body.setOffset(-30, -70);
        }

        // Player stands up
        this.tweens.add({
            targets: this.player.container,
            angle: 0,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.player.setExpression('normal'); // Back to normal
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
