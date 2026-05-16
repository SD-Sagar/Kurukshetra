import Phaser from 'phaser';
import CharacterAssembler from '../utils/CharacterAssembler';

export default class NetworkPlayer {
    constructor(scene, data, x, y) {
        this.scene = scene;
        this.id = data.id;
        this.name = data.name;
        this.appearance = data.appearance;

        // Create visual container
        this.visual = new CharacterAssembler(scene, { 
            type: 'player', 
            appearance: this.appearance 
        });
        
        this.container = this.visual.container;
        this.container.setPosition(x || 0, y || 0);
        this.scene.physics.add.existing(this.container);
        
        // Physics setup (remote players are mostly kinematic/interpolated but need bodies for collision)
        this.container.body.setAllowGravity(false);
        this.container.body.setSize(40, 80);
        this.container.body.setOffset(-20, -40);

        // Name Tag
        this.nameTag = scene.add.text(0, -60, this.name, {
            font: 'bold 14px monospace',
            fill: '#ffffff',
            backgroundColor: '#00000066',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
        
        this.container.add(this.nameTag);

        // Interpolation targets
        this.targetX = this.container.x;
        this.targetY = this.container.y;
        this.targetRotation = 0;
        this.isCrouching = false;
        this.currentWeapon = 'pistol';
        this.isDead = false;
    }

    updateData(data) {
        // Interpolation targets (Smoothing out the movement)
        this.targetX = data.x;
        this.targetY = data.y;
        this.targetAimX = data.aimX;
        this.targetAimY = data.aimY;
        this.isCrouching = data.isCrouching;
        this.currentWeapon = data.weapon;
        this.velocityX = data.vx;
    }

    update(time, delta) {
        // Smooth Interpolation (Lerp)
        const lerpFactor = 0.15; // Lower for smoother movement
        const dist = Phaser.Math.Distance.Between(this.container.x, this.container.y, this.targetX, this.targetY);
        
        // If we move a LOT while invisible, we probably respawned!
        if (dist > 100 && !this.container.visible) {
            this.isDead = false;
            this.visual.reset();
        }

        if (this.isDead) return; // Don't move or show if dead

        if (dist > 300) {
            this.container.x = this.targetX;
            this.container.y = this.targetY;
        } else if (dist > 0.01) {
            this.container.x += (this.targetX - this.container.x) * lerpFactor;
            this.container.y += (this.targetY - this.container.y) * lerpFactor;
        }
 
        // Update visuals
        if (this.visual) {
            this.visual.update(time, delta, this.velocityX || 0, this.isCrouching, this.currentWeapon);
            
            if (this.targetAimX !== undefined) {
                this.visual.aimAt(this.targetAimX, this.targetAimY);
            }
        }

        // Update Hitbox
        if (this.container.body) {
            this.container.body.setSize(60, 100);
            this.container.body.setOffset(-30, -50);
        }
    }

    destroy() {
        this.visual.destroy();
    }
}
