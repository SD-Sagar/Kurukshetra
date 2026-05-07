import Phaser from 'phaser';
import WeaponSystem from '../systems/WeaponSystem';
import CharacterAssembler from '../utils/CharacterAssembler';

export default class SargeAI {
    constructor(scene, x, y, player) {
        this.scene = scene;
        this.player = player;

        // 1. Create the Visual Assembly
        this.visual = new CharacterAssembler(scene, { type: 'sarge' });

        // 2. Create the Hitbox
        this.sprite = this.scene.physics.add.sprite(x, y, null);
        this.sprite.body.setSize(40, 80);
        this.sprite.setVisible(false);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setDragX(500);

        // State
        this.health = 200; // Sarge is tough
        this.weapons = new WeaponSystem(scene, this.sprite, this.visual);
        this.weapons.addWeapon('sarge_smg', 9999);
    }

    say(text, duration = 3000) {
        if (this.speech) this.speech.destroy();

        const bubble = this.scene.add.container(0, 0);
        const bg = this.scene.add.rectangle(0, -100, 200, 50, 0x000000, 0.8).setStrokeStyle(2, 0xffffff);
        const txt = this.scene.add.text(0, -100, text, { font: '16px monospace', fill: '#ffffff' }).setOrigin(0.5);

        bubble.add([bg, txt]);
        this.speech = bubble;

        this.scene.time.addEvent({
            delay: duration,
            callback: () => { if (this.speech === bubble) this.speech.destroy(); }
        });
    }

    update(time, delta, enemiesGroup) {
        if (!this.sprite || !this.sprite.active || !this.sprite.body) return;

        // Sync speech position
        if (this.speech) {
            this.speech.setPosition(this.sprite.x, this.sprite.y);
        }

        // Sync visual
        const currentWpKey = this.weapons.inventory[this.weapons.currentSlot];
        this.visual.container.setPosition(this.sprite.x, this.sprite.y + 10);
        this.visual.update(time, delta, this.sprite.body.velocity.x, false, currentWpKey);

        // Find nearest enemy to shoot
        let nearestEnemy = null;
        let shortestDistance = 500; // Detection radius

        if (enemiesGroup && enemiesGroup.getChildren().length > 0) {
            enemiesGroup.getChildren().forEach(enemy => {
                if (!enemy.active) return;
                const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, enemy.x, enemy.y);
                if (dist < shortestDistance) {
                    shortestDistance = dist;
                    nearestEnemy = enemy;
                }
            });
        }

        // Behavior: Shoot enemies
        if (nearestEnemy) {
            this.weapons.fire(nearestEnemy.x, nearestEnemy.y);
            this.visual.aimAt(nearestEnemy.x, nearestEnemy.y);
        }

        // Behavior: Follow player ALWAYS if too far
        const distToPlayer = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.player.sprite.x, this.player.sprite.y);

        if (distToPlayer > 150) { // Tighter leash
            if (this.player.sprite.x < this.sprite.x) {
                this.sprite.setVelocityX(-400); // Snappy movement
            } else {
                this.sprite.setVelocityX(400);
            }

            // Vertical tracking (Jetpack up to player)
            if (this.player.sprite.y < this.sprite.y - 100) {
                // Thrust upwards to reach player's level
                this.sprite.setAccelerationY(-2000);
            } else {
                // Stop thrusting
                this.sprite.setAccelerationY(0);

                // Simple jump over horizontal obstacles
                if (this.sprite.body.blocked.left || this.sprite.body.blocked.right) {
                    if (this.sprite.body.touching.down) {
                        this.sprite.setVelocityY(-400);
                    }
                }
            }
        } else {
            this.sprite.setVelocityX(0);
            this.sprite.setAccelerationY(0);
        }
    }
}
