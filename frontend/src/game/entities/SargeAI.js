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
        this.sprite.body.setDragX(600);
        this.sprite.body.setMaxVelocity(450, 1000);

        // State
        this.health = 200; // Sarge is tough
        this.weapons = new WeaponSystem(scene, this.sprite, this.visual);
        this.weapons.addWeapon('sarge_smg', 9999);

        // 3. Jetpack Particles (Matching Player)
        this.jetpackParticles = this.scene.add.particles(0, 0, 'bullet_player', {
            speed: { min: 50, max: 150 },
            angle: { min: 80, max: 100 },
            scale: { start: 1.2, end: 0 },
            lifespan: 300,
            gravityY: 400,
            frequency: -1,
            tint: 0x44aaff, // Blue flame for Sarge
            blendMode: 'ADD'
        });
        this.jetpackParticles.setDepth(5);

        // Independent Movement State
        this.targetXOffset = -150;
        this.targetYOffset = -50;
        this.nextCheckTime = 0;

        // Stuck Detection
        this.lastX = x;
        this.lastY = y;
        this.stuckTime = 0;
        this.isEvading = false;
        this.evadeTimer = 0;

        // Situational Awareness
        this.verticalCommitTimer = 0;
        this.ledgeSearchDirection = null;
        this.lastProgressCheck = 0;
        this.lastDistToPlayer = 9999;
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

        const playerSprite = this.player.sprite;
        const distToPlayer = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, playerSprite.x, playerSprite.y);

        // 1. Visual Sync
        const currentWpKey = this.weapons.inventory[this.weapons.currentSlot];
        this.visual.container.setPosition(this.sprite.x, this.sprite.y + 10);
        this.visual.update(time, delta, this.sprite.body.velocity.x, false, currentWpKey);

        // 2. Stuck & Progress Detection
        const distMoved = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.lastX, this.lastY);
        if (distMoved < 1.5 && !this.isEvading) this.stuckTime += delta;
        else this.stuckTime = 0;
        this.lastX = this.sprite.x;
        this.lastY = this.sprite.y;

        // Progress Monitor: If no progress in 2s, reroute
        if (time > this.lastProgressCheck + 2000) {
            if (distToPlayer > this.lastDistToPlayer - 10 && distToPlayer > 200) {
                this.targetXOffset *= -1; // Try the other side
                this.nextCheckTime = time + 1000;
            }
            this.lastDistToPlayer = distToPlayer;
            this.lastProgressCheck = time;
        }

        if (this.stuckTime > 1000) {
            this.isEvading = true;
            this.evadeTimer = time + 800;
            this.evadeDir = Math.random() > 0.5 ? 1 : -1;
            this.stuckTime = 0;
        }
        if (this.isEvading && time > this.evadeTimer) this.isEvading = false;

        // 3. Combat Logic
        let nearestEnemy = null;
        let shortestDistance = 600; 
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
        if (nearestEnemy) {
            this.weapons.fire(nearestEnemy.x, nearestEnemy.y);
            this.visual.aimAt(nearestEnemy.x, nearestEnemy.y);
        } else {
            this.visual.aimAt(playerSprite.x + (playerSprite.body.velocity.x * 2), playerSprite.y);
        }

        // 4. Movement Logic (The "Smart Brain")
        if (time > this.nextCheckTime) {
            const side = playerSprite.x < this.sprite.x ? 1 : -1;
            this.targetXOffset = Phaser.Math.Between(150, 300) * side;
            this.targetYOffset = Phaser.Math.Between(-100, -30);
            this.nextCheckTime = time + Phaser.Math.Between(1000, 2000);
        }

        let targetX = playerSprite.x + this.targetXOffset;
        let targetY = playerSprite.y + this.targetYOffset;

        const accel = 800;
        const isBlockedSide = this.sprite.body.blocked.left || this.sprite.body.blocked.right;
        const isBlockedUp = this.sprite.body.blocked.up;
        const isBlockedDown = this.sprite.body.blocked.down;
        const isBelowPlayer = this.sprite.y > playerSprite.y + 60;
        const isAbovePlayer = this.sprite.y < playerSprite.y - 100;

        // --- AWARENESS: Wall Scaling Commitment ---
        if (isBlockedSide && isBelowPlayer && time > this.verticalCommitTimer) {
            this.verticalCommitTimer = time + 1200; // Commit to climbing for 1.2s
        }

        // --- AWARENESS: Ledge Search (Drop Down) ---
        if (isAbovePlayer && isBlockedDown) {
            if (!this.ledgeSearchDirection) this.ledgeSearchDirection = (this.sprite.x < playerSprite.x) ? 1 : -1;
            this.sprite.setAccelerationX(accel * 1.5 * this.ledgeSearchDirection);
        } else {
            this.ledgeSearchDirection = null;

            // Panic Evade
            if (this.isEvading) {
                this.sprite.setAccelerationX(accel * 1.6 * this.evadeDir);
                this.sprite.setAccelerationY(Math.random() > 0.3 ? -2200 : 0);
            } 
            // Gap Search (Up)
            else if (isBelowPlayer && isBlockedUp) {
                if (!this.searchDirection) this.searchDirection = Math.random() > 0.5 ? 1 : -1;
                this.sprite.setAccelerationX(accel * 1.2 * this.searchDirection);
            } 
            // Standard Follow
            else {
                this.searchDirection = null;
                if (Math.abs(this.sprite.x - targetX) > 40) {
                    this.sprite.setAccelerationX(this.sprite.x < targetX ? accel : -accel);
                } else {
                    this.sprite.setAccelerationX(0);
                }
            }
        }

        // Vertical Movement
        if (!this.isEvading) {
            let thrustPower = 0;
            // High Priority: Wall Scaling Commitment
            if (time < this.verticalCommitTimer && !isBlockedUp) {
                thrustPower = 2000;
            }
            // Normal: Fly to player
            else if (this.sprite.y > targetY + 20) {
                if (!isBlockedUp) {
                    const distY = Math.abs(this.sprite.y - targetY);
                    thrustPower = Math.min(2200, 1000 + distY * 5);
                }
            } 
            // Obstacle Hop
            else if (isBlockedSide && (isBlockedDown || isBelowPlayer)) {
                thrustPower = 1800;
            }

            if (thrustPower > 0) {
                this.sprite.setAccelerationY(-thrustPower);
                if (time % 100 < 30) this.jetpackParticles.emitParticleAt(this.sprite.x, this.sprite.y + 40);
            } else {
                this.sprite.setAccelerationY(0);
            }
        }

        if (this.speech) this.speech.setPosition(this.sprite.x, this.sprite.y);
    }
}
