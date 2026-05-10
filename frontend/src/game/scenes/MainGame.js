import Phaser from 'phaser';
import Player from '../entities/Player';
import SargeAI from '../entities/SargeAI';
import CharacterAssembler from '../utils/CharacterAssembler';
import { useGameStore } from '../../store/gameStore';

export default class MainGame extends Phaser.Scene {
    constructor() {
        super('MainGame');
    }

    create() {
        // Generate placeholder textures
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xFFFF00); g.fillRect(0, 0, 8, 8); g.generateTexture('bullet_player', 8, 8);
        g.clear();
        g.fillStyle(0xFF4400); g.fillRect(0, 0, 8, 8); g.generateTexture('bullet_enemy', 8, 8);
        g.clear();
        g.fillStyle(0xFFFFFF); g.fillRect(0, 0, 32, 32); g.generateTexture('white_square', 32, 32);
        g.clear();
        g.fillStyle(0xFF8800); g.fillRect(0, 0, 10, 10); g.generateTexture('explosion_part', 10, 10);

        // Tiled Map Integration
        const map = this.make.tilemap({ key: 'map' });
        
        // Map Tilesets
        const bgTileset = map.addTilesetImage('background', 'tileset_background');
        const mainTileset = map.addTilesetImage('tileset_70', 'tileset_70', 70, 70, 0, 2);

        // Layers
        this.backgroundLayer = map.createLayer('Background_Walls', bgTileset, 0, 0);
        this.backgroundDetailsLayer = map.createLayer('Background_Details', bgTileset, 0, 0);
        this.platformLayer = map.createLayer('Platforms', [bgTileset, mainTileset], 0, 0);
        this.bushesLayer = map.createLayer('Foreground_Bushes', [bgTileset, mainTileset], 0, 0).setDepth(10);
        this.overlayLayer = map.createLayer('Overlay', [bgTileset, mainTileset], 0, 0).setDepth(20);

        // Physics Details (Object Layer for curved edges)
        this.physicsDetails = this.physics.add.staticGroup();
        const details = map.createFromObjects('Physics_Details', {
            name: '',
            key: 'background'
        });
        details.forEach(detail => {
            detail.setDepth(5);
            detail.setVisible(false); // Hide the visual confirmation blocks
            this.physicsDetails.add(detail);
        });

        // World Bounds from Map
        this.worldWidth = map.widthInPixels;
        this.worldHeight = map.heightInPixels;
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.physics.world.TILE_BIAS = 40; // High precision for high speeds
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Collision
        this.platformLayer.setCollisionByProperty({ collides: true });
        this.platformLayer.setCollisionByExclusion([-1]); // Fallback: collide with all tiles in this layer
        this.platforms = this.platformLayer; // For existing collision logic

        this.weaponPickups = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.enemyBullets = this.physics.add.group({ classType: Phaser.Physics.Arcade.Image, runChildUpdate: true });

        // Enemy Jetpack Particles (Red)
        this.enemyJetpackParticles = this.add.particles(0, 0, 'bullet_player', {
            speed: { min: 50, max: 150 },
            angle: { min: 80, max: 100 },
            scale: { start: 1.0, end: 0 },
            lifespan: 300,
            gravityY: 400,
            frequency: -1,
            tint: 0xff3333,
            blendMode: 'ADD'
        });
        this.enemyJetpackParticles.setDepth(5);

        // Spawn Entities from Object Layer
        const spawnLayer = map.getObjectLayer('Spawns_And_Pickups');
        let playerSpawn = { x: this.worldWidth / 2, y: this.worldHeight - 300 };
        let sargeSpawn = { x: this.worldWidth / 2 - 150, y: this.worldHeight - 300 };

        if (spawnLayer) {
            // First pass: Find player and sarge spawns
            spawnLayer.objects.forEach(obj => {
                if (obj.name === 'player_spawn') {
                    playerSpawn = { x: obj.x, y: obj.y };
                } else if (obj.name === 'sarge_spawn') {
                    sargeSpawn = { x: obj.x, y: obj.y };
                }
            });
        }

        // Initialize characters before spawning enemies/loot
        this.player = new Player(this, playerSpawn.x, playerSpawn.y);
        this.sarge = new SargeAI(this, sargeSpawn.x, sargeSpawn.y, this.player);

        if (spawnLayer) {
            // Second pass: Spawn enemies and loot
            spawnLayer.objects.forEach(obj => {
                if (obj.name === 'enemy_spawn') {
                    this.spawnEnemyAt(obj.x, obj.y);
                } else if (obj.name === 'loot_drop') {
                    const keys = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'launcher', 'machinegun', 'tacticalshotgun'];
                    const key = keys[Phaser.Math.Between(0, keys.length - 1)];
                    this.spawnWeaponPickup(obj.x, obj.y, key);
                }
            });
        }

        const store = useGameStore.getState();
        this.player.weapons.addWeapon(store.selectedWeapons[0] || 'pistol');
        this.player.weapons.addWeapon('dagger');

        if (store.userProfile && !store.isNewGame) {
            this.time.delayedCall(1500, () => {
                if (this.sarge) this.sarge.say("Where have you been, Pilot?", 4000);
            });
        }

        // Colliders
        this.physics.add.collider(this.player.sprite, [this.platforms, this.physicsDetails]);
        this.physics.add.collider(this.sarge.sprite, [this.platforms, this.physicsDetails]);
        this.physics.add.collider(this.enemies, [this.platforms, this.physicsDetails]);
        this.physics.add.collider(this.weaponPickups, [this.platforms, this.physicsDetails]);

        this.physics.add.collider(this.player.weapons.bullets, [this.platforms, this.physicsDetails], (b) => {
            if (b.isRocket) b.onImpact(); else b.destroy();
        });
        this.physics.add.collider(this.sarge.weapons.bullets, [this.platforms, this.physicsDetails], (b) => {
            if (b.isRocket) b.onImpact(); else b.destroy();
        });
        this.physics.add.collider(this.enemyBullets, [this.platforms, this.physicsDetails], (b) => {
            if (b.isRocket) b.onImpact(); else b.destroy();
        });
        this.physics.add.collider(this.player.weapons.grenadeGroup, [this.platforms, this.physicsDetails]);
        this.physics.add.collider(this.player.weapons.grenadeGroup, this.enemies);

        this.physics.add.overlap(this.player.weapons.bullets, this.enemies, this.bulletHitEnemy, null, this);
        this.physics.add.overlap(this.sarge.weapons.bullets, this.enemies, this.bulletHitEnemy, null, this);
        this.physics.add.overlap(this.enemyBullets, this.sarge.sprite, (s, b) => {
            if (b.isRocket) b.onImpact(); else b.destroy();
        }, null, this);

        this.physics.add.overlap(this.enemyBullets, this.player.sprite, this.enemyBulletHitPlayer, null, this);
        this.physics.add.overlap(this.enemies, this.player.sprite, () => this.player.takeDamage(1), null, this);

        // Zoom
        this.currentZoomIndex = 0;
        this.uiZoomLevels = [1, 2, 4]; // 1x, 2x, 4x of base
        this.updateBaseZoom();
        this.applyCurrentZoom();
        
        // Re-calculate on window resize
        this.scale.on('resize', () => {
            this.updateBaseZoom();
            this.applyCurrentZoom();
        });

        this.input.keyboard.on('keydown-Z', () => this.toggleZoom());

        // Enemy Spawner
        this.time.addEvent({ delay: 3000, callback: this.spawnEnemy, callbackScope: this, loop: true });
    }

    updateBaseZoom() {
        // Calculate the minimum zoom required to fill the entire screen
        const widthZoom = this.scale.width / this.worldWidth;
        const heightZoom = this.scale.height / this.worldHeight;
        // Max ensures we cover the smaller dimension completely
        this.baseZoom = Math.max(widthZoom, heightZoom);
    }

    applyCurrentZoom(instant = true) {
        const uiLabel = this.uiZoomLevels[this.currentZoomIndex];
        // 1x = Close (baseZoom * 4), 4x = Far (baseZoom * 1)
        const targetZoom = this.baseZoom * (4 / uiLabel);
        if (instant) {
            this.cameras.main.setZoom(targetZoom);
        } else {
            this.cameras.main.zoomTo(targetZoom, 300, 'Power2');
        }
    }

    toggleZoom() {
        this.currentZoomIndex++;
        if (this.currentZoomIndex >= this.uiZoomLevels.length) this.currentZoomIndex = 0;
        const uiLabel = this.uiZoomLevels[this.currentZoomIndex];
        useGameStore.getState().setZoomLevel(uiLabel);
        this.applyCurrentZoom(false);
    }

    spawnWeaponPickup(x, y, weaponKey, ammo = null) {
        if (!this.player || !this.player.weapons) return;
        const wpData = this.player.weapons.weaponData[weaponKey];
        const pickup = this.weaponPickups.create(x, y, weaponKey);
        pickup.setTint(0xffffff); // Clear tint
        pickup.setDisplaySize(60, 30); // Slightly larger for visibility
        pickup.weaponKey = weaponKey;
        pickup.ammo = ammo || { loaded: wpData.magSize, reserve: wpData.magSize * 2 };
        pickup.body.setSize(40, 20).setBounce(0.5).setDrag(100);
        pickup.body.setVelocity(Phaser.Math.Between(-100, 100), -200);
        this.time.delayedCall(10000, () => { if (pickup.active) pickup.destroy(); });
        return pickup;
    }

    spawnEnemy() {
        if (this.enemies.countActive() >= 10) return;
        const cam = this.cameras.main;
        const spawnX = Math.random() > 0.5 ? cam.scrollX - 400 : cam.scrollX + cam.width + 400;
        let spawnY = this.player ? this.player.sprite.y - 500 : this.worldHeight / 2;
        this.spawnEnemyAt(Phaser.Math.Clamp(spawnX, 200, this.worldWidth - 200), Phaser.Math.Clamp(spawnY, 800, this.worldHeight - 500));
    }

    spawnEnemyAt(x, y) {
        const enemy = this.enemies.create(x, y, 'white_square');
        enemy.body.setSize(40, 80).setDragX(600).setMaxVelocity(400, 1000);
        enemy.setVisible(false);
        enemy.health = 50;
        enemy.lastFired = 0;
        enemy.lastX = x;
        enemy.lastY = y;
        enemy.stuckTime = 0;
        enemy.searchDirection = null;
        enemy.isEvading = false;
        enemy.evadeTimer = 0;
        enemy.evadeDir = 1;

        // Situational Awareness
        enemy.verticalCommitTimer = 0;
        enemy.ledgeSearchDirection = null;
        enemy.lastProgressCheck = 0;
        enemy.lastDistToPlayer = 9999;

        const keys = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'launcher', 'machinegun', 'tacticalshotgun'];
        enemy.weaponKey = keys[Phaser.Math.Between(0, keys.length - 1)];
        enemy.weaponStats = this.player.weapons.weaponData[enemy.weaponKey];
        enemy.visual = new CharacterAssembler(this, { type: 'enemy' });
    }

    fireEnemyWeapon(enemy, stats) {
        const targetX = this.player.sprite.x;
        const targetY = this.player.sprite.y;
        const baseAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, targetX, targetY);

        const spawnB = (angle) => {
            let spawnX = enemy.x;
            let spawnY = enemy.y;

            if (enemy.visual && enemy.visual.getMuzzlePosition) {
                const muzzle = enemy.visual.getMuzzlePosition();
                spawnX = muzzle.x;
                spawnY = muzzle.y;
            }

            const b = this.enemyBullets.get(spawnX, spawnY, 'bullet_enemy');
            if (b) {
                b.setActive(true).setVisible(true).setTint(stats.projectileColor || stats.color);
                b.damage = stats.damage;
                if (b.body) {
                    b.body.reset(spawnX, spawnY);
                    b.body.setAllowGravity(false);
                    b.body.setSize(stats.isRocket ? 16 : 8, 8);
                }

                // USE NEW BULLET PNG FOR ENEMIES TOO
                const useBulletPng = ['pistol', 'rifle', 'smg', 'machinegun'].includes(stats.key);
                if (useBulletPng) {
                    b.setTexture('bullet');
                    b.setRotation(angle + Math.PI); // Faces Left in PNG
                    b.setDisplaySize(20, 10);
                } else {
                    b.setRotation(angle);
                }

                if (stats.isRocket) {
                    b.setRotation(angle);
                    b.setTexture('rocket');
                    b.setDisplaySize(45, 22); // LARGER ROCKET
                    b.setTint(0xffffff);
                    b.isRocket = true;
                    b.onImpact = () => {
                        this.player.weapons.createExplosion(b.x, b.y, 150, stats.damage, enemy);
                        b.destroy();
                    };
                }

                if (stats.isTracer) {
                    b.setVisible(false);
                    const line = this.add.graphics();
                    line.lineStyle(2, 0xffffff, 0.8);

                    let endX = enemy.x + Math.cos(angle) * stats.range;
                    let endY = enemy.y + Math.sin(angle) * stats.range;

                    const step = 20;
                    for (let d = 0; d < stats.range; d += step) {
                        const px = enemy.x + Math.cos(angle) * d;
                        const py = enemy.y + Math.sin(angle) * d;

                        const hitWall = this.platformLayer.getTileAtWorldXY(px, py, true)?.canCollide;
                        const hitPlayer = this.player.sprite.getBounds().contains(px, py);
                        const hitSarge = this.sarge.sprite.getBounds().contains(px, py);

                        if (hitWall || hitPlayer || hitSarge) {
                            endX = px;
                            endY = py;
                            break;
                        }
                    }

                    line.lineBetween(enemy.x, enemy.y, endX, endY);
                    this.tweens.add({
                        targets: line,
                        alpha: 0,
                        duration: 150,
                        onComplete: () => line.destroy()
                    });
                    this.physics.moveTo(b, endX, endY, stats.muzzleSpeed);
                } else {
                    const tx = enemy.x + Math.cos(angle) * 100;
                    const ty = enemy.y + Math.sin(angle) * 100;
                    this.physics.moveTo(b, tx, ty, stats.muzzleSpeed);
                }

                this.time.delayedCall((stats.range / stats.muzzleSpeed) * 1000, () => {
                    if (b.active) {
                        if (b.isRocket) b.onImpact();
                        else b.destroy();
                    }
                });
            }
        };

        if (enemy.weaponKey && enemy.weaponKey.includes('shotgun')) {
            const spreadRad = Phaser.Math.DegToRad(stats.fanAngle);
            const step = spreadRad / (stats.pellets - 1);
            const startAngle = baseAngle - (spreadRad / 2);
            for (let i = 0; i < stats.pellets; i++) spawnB(startAngle + (step * i));
        } else if (stats.spread > 0) {
            const wobble = (Math.random() - 0.5) * stats.spread;
            spawnB(baseAngle + wobble);
        } else {
            spawnB(baseAngle);
        }
    }

    bulletHitEnemy(bullet, enemy) {
        if (!bullet.active || !enemy.active) return;
        if (bullet.isRocket) { bullet.onImpact(); return; }

        enemy.health -= bullet.damage || 15;
        bullet.destroy();

        if (enemy.health <= 0) {
            const particles = this.add.particles(enemy.x, enemy.y, 'explosion_part', {
                speed: { min: 100, max: 300 },
                lifespan: 500,
                scale: { start: 1, end: 0 },
                quantity: 20,
                blendMode: 'ADD'
            });
            this.time.delayedCall(500, () => particles.destroy());

            if (enemy.weaponKey) this.spawnWeaponPickup(enemy.x, enemy.y, enemy.weaponKey);
            if (enemy.visual) enemy.visual.destroy();
            enemy.destroy();
        }
    }

    enemyBulletHitPlayer(playerSprite, bullet) {
        if (!bullet || !bullet.active) return;
        if (bullet.isRocket) {
            bullet.onImpact();
            return;
        }

        this.player.takeDamage(bullet.damage || 10);
        bullet.destroy();
    }

    update(time, delta) {
        if (this.player) this.player.update(time, delta, this.input.activePointer);
        if (this.sarge) this.sarge.update(time, delta, this.enemies);

        // Update all enemies
        this.enemies.getChildren().forEach(enemy => {
            if (!enemy.active) return;
            
            // 1. Visual Sync
            enemy.visual.container.setPosition(enemy.x, enemy.y + 10);
            enemy.visual.update(time, delta, enemy.body.velocity.x, false, enemy.weaponKey);
            enemy.visual.aimAt(this.player.sprite.x, this.player.sprite.y);

            // 2. Combat
            if (time > enemy.lastFired) {
                this.fireEnemyWeapon(enemy, enemy.weaponStats);
                enemy.lastFired = time + enemy.weaponStats.fireRate;
            }

            // 3. Smart Movement AI (Mini Militia Style)
            const distToPlayer = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.sprite.x, this.player.sprite.y);
            const isBlockedSide = enemy.body.blocked.left || enemy.body.blocked.right;
            const isBlockedUp = enemy.body.blocked.up;
            const isBelowPlayer = enemy.y > this.player.sprite.y + 100;

            // Stuck & Progress Detection
            const distMoved = Phaser.Math.Distance.Between(enemy.x, enemy.y, enemy.lastX, enemy.lastY);
            if (distMoved < 1.5 && !enemy.isEvading) enemy.stuckTime += delta;
            else enemy.stuckTime = 0;
            enemy.lastX = enemy.x; enemy.lastY = enemy.y;

            // Progress Monitor (Reroute if no progress in 2s)
            if (time > enemy.lastProgressCheck + 2000) {
                if (distToPlayer > enemy.lastDistToPlayer - 10 && distToPlayer > 300) {
                    enemy.searchDirection = Math.random() > 0.5 ? 1 : -1; // Force a re-route
                    enemy.stuckTime = 1100; // Trigger an evade to break loop
                }
                enemy.lastDistToPlayer = distToPlayer;
                enemy.lastProgressCheck = time;
            }

            // Trigger Panic Evade
            if (enemy.stuckTime > 1000) {
                enemy.isEvading = true;
                enemy.evadeTimer = time + 800; 
                enemy.evadeDir = Math.random() > 0.5 ? 1 : -1;
                enemy.stuckTime = 0;
            }
            if (enemy.isEvading && time > enemy.evadeTimer) enemy.isEvading = false;

            // Tactical Distance based on Weapon
            let idealDist = 300; 
            if (enemy.weaponKey === 'sniper' || enemy.weaponKey === 'rifle') idealDist = 600;
            if (enemy.weaponKey === 'shotgun' || enemy.weaponKey === 'smg') idealDist = 100;

            const accel = 600;
            const isBlockedDown = enemy.body.blocked.down;
            const isAbovePlayer = enemy.y < this.player.sprite.y - 100;
            
            // --- AWARENESS: Wall Scaling Commitment ---
            if (isBlockedSide && isBelowPlayer && time > enemy.verticalCommitTimer) {
                enemy.verticalCommitTimer = time + 1200;
            }

            // --- MOVEMENT OVERRIDE: PANIC EVADE ---
            if (enemy.isEvading) {
                enemy.setAccelerationX(accel * 1.8 * enemy.evadeDir);
                enemy.setAccelerationY(Math.random() > 0.3 ? -2200 : 0);
                if (time % 100 < 40) this.enemyJetpackParticles.emitParticleAt(enemy.x, enemy.y + 40);
            }
            // --- AWARENESS: Ledge Search (Drop Down) ---
            else if (isAbovePlayer && isBlockedDown) {
                if (!enemy.ledgeSearchDirection) enemy.ledgeSearchDirection = (enemy.x < this.player.sprite.x) ? 1 : -1;
                enemy.setAccelerationX(accel * 1.5 * enemy.ledgeSearchDirection);
            }
            // --- GAP SEARCH (Up) ---
            else if (isBelowPlayer && isBlockedUp) {
                enemy.ledgeSearchDirection = null;
                if (!enemy.searchDirection) enemy.searchDirection = Math.random() > 0.5 ? 1 : -1;
                enemy.setAccelerationX(accel * 1.5 * enemy.searchDirection);
            } 
            // --- STANDARD FOLLOW ---
            else {
                enemy.ledgeSearchDirection = null;
                enemy.searchDirection = null;
                if (distToPlayer > idealDist + 50) {
                    enemy.setAccelerationX(this.player.sprite.x < enemy.x ? -accel : accel);
                } else if (distToPlayer < idealDist - 50 && enemy.weaponKey !== 'smg') {
                    enemy.setAccelerationX(this.player.sprite.x < enemy.x ? accel : -accel);
                } else {
                    enemy.setAccelerationX(0);
                }
            }

            // Vertical Logic (Smart Jetpack)
            if (!enemy.isEvading) {
                let thrustPower = 0;
                // Priority 1: Wall Climb Commitment
                if (time < enemy.verticalCommitTimer && !isBlockedUp) {
                    thrustPower = 2000;
                }
                // Priority 2: Standard Chasing
                else if (enemy.y > this.player.sprite.y + 50 && !isBlockedUp) {
                    const distY = Math.abs(enemy.y - this.player.sprite.y);
                    thrustPower = Math.min(2200, 1000 + distY * 5);
                }
                // Priority 3: Obstacle Hop
                else if (isBlockedSide && (isBlockedDown || isBelowPlayer)) {
                    thrustPower = 1800;
                }

                if (thrustPower > 0) {
                    enemy.setAccelerationY(-thrustPower);
                    if (time % 150 < 30) this.enemyJetpackParticles.emitParticleAt(enemy.x, enemy.y + 40);
                } else {
                    enemy.setAccelerationY(0);
                }
            }
        });

        // REFINED: Camera smoothing and mouse peeking
        const cam = this.cameras.main;
        const pointer = this.input.activePointer;
        const targetX = this.player.sprite.x + (pointer.x - cam.width / 2) * 0.4;
        const targetY = this.player.sprite.y + (pointer.y - cam.height / 2) * 0.4;

        cam.scrollX += (targetX - (cam.scrollX + cam.width / 2)) * 0.15;
        cam.scrollY += (targetY - (cam.scrollY + cam.height / 2)) * 0.15;
    }
}

