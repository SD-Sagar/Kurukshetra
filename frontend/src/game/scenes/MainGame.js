import Phaser from 'phaser';
import Player from '../entities/Player';
import SargeAI from '../entities/SargeAI';
import CharacterAssembler from '../utils/CharacterAssembler';
import Pathfinder from '../utils/Pathfinder';
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

        // Initialize Pathfinding (The "Map Knowledge")
        this.pathfinder = new Pathfinder(this, map, this.platformLayer);

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
        this.playerSpawns = [];
        let sargeSpawn = { x: this.worldWidth / 2 - 150, y: this.worldHeight - 300 };
        // Enable HUD for gameplay
        useGameStore.getState().setShowHUD(true);

        // 1. First Pass: Find Essential Spawn Points
        this.lootPoints = [];
        if (spawnLayer) {
            spawnLayer.objects.forEach(obj => {
                if (obj.name === 'player_spawn') {
                    this.playerSpawns.push({ x: obj.x, y: obj.y });
                } else if (obj.name === 'sarge_spawn') {
                    sargeSpawn = { x: obj.x, y: obj.y };
                }
            });
        }

        // Default spawn if none found
        if (this.playerSpawns.length === 0) this.playerSpawns.push({ x: this.worldWidth / 2, y: this.worldHeight - 300 });
        const initialSpawn = this.playerSpawns[0];

        // 2. Initialize Hero Characters
        this.player = new Player(this, initialSpawn.x, initialSpawn.y - 50);
        this.sarge = new SargeAI(this, initialSpawn.x - 50, initialSpawn.y - 50, this.player, this.pathfinder);

        // 3. Second Pass: Spawn Enemies and Loot (Now safe to access this.player)
        this.enemySpawnPoints = [];
        if (spawnLayer) {
            spawnLayer.objects.forEach(obj => {
                if (obj.name === 'enemy_spawn') {
                    this.enemySpawnPoints.push({ x: obj.x, y: obj.y });
                } else if (obj.name === 'loot_drop') {
                    const point = { x: obj.x, y: obj.y, active: false, index: this.lootPoints.length };
                    this.lootPoints.push(point);
                    this.spawnNewLootAtPoint(point);
                }
            });
        }

        // Initial Populate
        for(let i=0; i<10; i++) this.spawnEnemy();

        const store = useGameStore.getState();
        this.player.weapons.addWeapon(store.selectedWeapons[0] || 'pistol');
        this.player.weapons.addWeapon('dagger');

        if (store.userProfile && !store.isNewGame) {
            this.time.delayedCall(1500, () => {
                if (this.sarge) this.sarge.say("Where have you been, Pilot?", 4000);
            });
        }

        // AI Initial Lock (Grounded for dialogue)
        this.initialAILock = true;
        this.time.delayedCall(4500, () => {
            this.initialAILock = false;
        });

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
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());

        // Enemy Spawner
        this.time.addEvent({ delay: 3000, callback: this.spawnEnemy, callbackScope: this, loop: true });
    }

    togglePause() {
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    pauseGame() {
        this.isPaused = true;
        this.physics.pause();
        this.scene.pause();
        this.showPauseMenu();
    }

    resumeGame() {
        this.isPaused = false;
        this.physics.resume();
        this.scene.resume();
        this.hidePauseMenu();
    }

    showPauseMenu() {
        let menu = document.getElementById('pause-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'pause-menu';
            menu.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.8); display: flex; flex-direction: column;
                justify-content: center; align-items: center; z-index: 9999;
                font-family: 'Orbitron', sans-serif; color: white;
            `;
            menu.innerHTML = `
                <h1 style="font-size: 3rem; margin-bottom: 2rem; color: #44aaff; text-shadow: 0 0 20px #44aaff;">PAUSED</h1>
                <button id="resume-btn" style="padding: 1rem 3rem; margin: 0.5rem; background: #222; border: 2px solid #44aaff; color: white; cursor: pointer; font-size: 1.2rem; width: 250px;">RESUME</button>
                <button id="menu-btn" style="padding: 1rem 3rem; margin: 0.5rem; background: #222; border: 2px solid #44aaff; color: white; cursor: pointer; font-size: 1.2rem; width: 250px;">EXIT TO MENU</button>
                <button id="exit-btn" style="padding: 1rem 3rem; margin: 0.5rem; background: #222; border: 2px solid #44aaff; color: white; cursor: pointer; font-size: 1.2rem; width: 250px;">QUIT GAME</button>
            `;
            document.body.appendChild(menu);

            document.getElementById('resume-btn').onclick = () => this.resumeGame();
            document.getElementById('menu-btn').onclick = () => {
                this.hidePauseMenu();
                this.scene.start('MainMenu');
            };
            document.getElementById('exit-btn').onclick = () => {
                this.hidePauseMenu();
                window.location.href = '/login';
            };
        }
        menu.style.display = 'flex';
    }

    hidePauseMenu() {
        const menu = document.getElementById('pause-menu');
        if (menu) menu.style.display = 'none';
    }

    onPlayerDeath() {
        if (this.player.isRespawning) return;
        this.player.isRespawning = true;

        // Drop current weapon (if not pistol)
        const currentWeapon = this.player.weapons.inventory[this.player.weapons.currentSlot];
        if (currentWeapon && currentWeapon !== 'pistol' && currentWeapon !== 'dagger') {
            this.spawnWeaponPickup(this.player.sprite.x, this.player.sprite.y, currentWeapon);
        }
        
        // Visual death effect (briefly see pieces before fade)
        this.time.delayedCall(1300, () => this.cameras.main.fadeOut(500, 0, 0, 0));

        this.time.delayedCall(2300, () => {
            // Find a Safe Respawn Point (No enemies within 400px)
            const safeSpawns = this.playerSpawns.filter(s => {
                let tooClose = false;
                this.enemies.getChildren().forEach(e => {
                    if (e.active && Phaser.Math.Distance.Between(s.x, s.y, e.x, e.y) < 400) tooClose = true;
                });
                return !tooClose;
            });

            // Fallback to first spawn if all are "hot"
            const spawn = safeSpawns.length > 0 
                ? safeSpawns[Phaser.Math.Between(0, safeSpawns.length - 1)] 
                : this.playerSpawns[0];

            this.player.sprite.setPosition(spawn.x, spawn.y);
            this.player.health = 100;
            this.player.fuel = 100;
            this.player.isRespawning = false;
            this.player.sprite.setActive(true);
            this.player.sprite.body.setEnable(true);
            this.player.sprite.body.reset(spawn.x, spawn.y);
            this.player.visual.reset();

            // Reset Loadout on Respawn
            this.player.weapons.resetInventory();
            this.player.weapons.addWeapon('pistol');
            this.player.weapons.addWeapon('dagger');

            // Teleport Sarge
            this.sarge.sprite.setPosition(spawn.x - 50, spawn.y);
            this.sarge.say("This is not the way recruit", 4000);

            this.cameras.main.fadeIn(500, 0, 0, 0);
        });
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

    spawnNewLootAtPoint(point) {
        const keys = ['pistol', 'smg', 'rifle', 'shotgun', 'sniper', 'launcher', 'machinegun', 'tacticalshotgun', 'grenade'];
        const key = keys[Phaser.Math.Between(0, keys.length - 1)];
        this.spawnWeaponPickup(point.x, point.y, key, null, true, point.index);
        point.active = true;
    }

    spawnWeaponPickup(x, y, weaponKey, ammo = null, isPermanent = false, pointIndex = -1) {
        if (!this.player || !this.player.weapons) return;
        
        const pickup = this.weaponPickups.create(x, y, weaponKey);
        pickup.setTint(0xffffff); 
        pickup.weaponKey = weaponKey;
        pickup.isPermanent = isPermanent;
        pickup.pointIndex = pointIndex;

        if (weaponKey === 'grenade') {
            pickup.setDisplaySize(33, 33); // Match grenade belt size
            pickup.ammo = { count: 3 };
        } else {
            const wpData = this.player.weapons.weaponData[weaponKey];
            pickup.setDisplaySize(60, 30);
            pickup.ammo = ammo || { loaded: wpData.magSize, reserve: wpData.magSize * 2 };
        }

        pickup.body.setSize(40, 20).setBounce(0.5).setDrag(100);
        
        if (!isPermanent) {
            pickup.body.setVelocity(Phaser.Math.Between(-100, 100), -200);
            this.time.delayedCall(10000, () => { if (pickup.active) pickup.destroy(); });
        } else {
            pickup.body.setImmovable(true);
            pickup.body.setAllowGravity(false);
        }
        return pickup;
    }

    handleLootPickup(pointIndex) {
        if (pointIndex === -1) return;
        const point = this.lootPoints[pointIndex];
        point.active = false;
        
        // 15 Second Respawn Timer
        this.time.delayedCall(15000, () => {
            this.spawnNewLootAtPoint(point);
        });
    }

    spawnEnemy() {
        const activeCount = this.enemies.countActive();
        if (activeCount >= 10) return;

        // Need to refill
        const needed = 10 - activeCount;
        for (let i = 0; i < needed; i++) {
            // Find a Medium-Distance spawn point (500-1000 pixels)
            let candidates = this.enemySpawnPoints.filter(s => {
                const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, s.x, s.y);
                return dist >= 500 && dist <= 1000;
            });

            // Fallback: If no medium ones, pick furthest
            if (candidates.length === 0) {
                candidates = [...this.enemySpawnPoints].sort((a, b) => {
                    const distA = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, a.x, a.y);
                    const distB = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, b.x, b.y);
                    return distB - distA;
                });
            }

            if (candidates.length > 0) {
                const target = candidates[Math.floor(Math.random() * Math.min(candidates.length, 3))];
                this.spawnEnemyAt(target.x, target.y);
            }
        }
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

        // Pathfinding State
        enemy.path = [];
        enemy.currentPathIndex = 0;
        enemy.lastPathUpdate = 0;

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
            if (enemy.visual) enemy.visual.explode();
            enemy.destroy();
            
            // Instantly trigger refill
            this.time.delayedCall(500, () => this.spawnEnemy());
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
        if (this.sarge) this.sarge.update(time, delta, this.enemies, this.initialAILock);

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

            // --- A* PATHFINDING UPDATE ---
            // Recalculate path every 1s (Staggered by enemy index to prevent spikes)
            const pathUpdateInterval = 1000;
            if (time > enemy.lastPathUpdate + pathUpdateInterval) {
                const newPath = this.pathfinder.findPath(enemy.x, enemy.y, this.player.sprite.x, this.player.sprite.y);
                if (newPath) {
                    enemy.path = newPath;
                    enemy.currentPathIndex = 0;
                }
                enemy.lastPathUpdate = time + (Math.random() * 200); // Stagger next update
            }

            // Determine moveTarget (Waypoint vs Direct Player)
            let moveTarget = { x: this.player.sprite.x, y: this.player.sprite.y };
            if (enemy.path && enemy.path.length > 0 && enemy.currentPathIndex < enemy.path.length) {
                moveTarget = enemy.path[enemy.currentPathIndex];
                
                // Advance waypoint if close
                const distToWaypoint = Phaser.Math.Distance.Between(enemy.x, enemy.y, moveTarget.x, moveTarget.y);
                if (distToWaypoint < 40) {
                    enemy.currentPathIndex++;
                }
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
            
            // --- MOVEMENT EXECUTION ---
            if (enemy.isEvading && !this.initialAILock) {
                enemy.setAccelerationX(accel * 2.5 * enemy.evadeDir);
                enemy.setAccelerationY(-2400); 
                if (time % 100 < 40) this.enemyJetpackParticles.emitParticleAt(enemy.x, enemy.y + 40);
            }
            else {
                // Horizontal Move to Target
                const dx = moveTarget.x - enemy.x;
                const distToTarget = Math.abs(dx);
                
                // If pathfinding, move to waypoint. If reached end, use tactical distance.
                const isPathing = enemy.path && enemy.currentPathIndex < enemy.path.length;
                
                if (isPathing) {
                    if (distToTarget > 10) {
                        enemy.setAccelerationX(dx > 0 ? accel : -accel);
                    } else {
                        enemy.setAccelerationX(0);
                    }
                } else {
                    // Tactical Distance Logic (Player is moveTarget here)
                    if (distToPlayer > idealDist + 50) {
                        enemy.setAccelerationX(this.player.sprite.x < enemy.x ? -accel : accel);
                    } else if (distToPlayer < idealDist - 50 && enemy.weaponKey !== 'smg') {
                        enemy.setAccelerationX(this.player.sprite.x < enemy.x ? accel : -accel);
                    } else {
                        enemy.setAccelerationX(0);
                    }
                }

                // Vertical Logic (Smart Jetpack to Target)
                let thrustPower = 0;
                if (!this.initialAILock) {
                    if (enemy.y > moveTarget.y + 20 && !isBlockedUp) {
                        const dy = Math.abs(enemy.y - moveTarget.y);
                        thrustPower = Math.min(2200, 1000 + dy * 5);
                    } else if (isBlockedSide && !isBlockedUp) {
                        thrustPower = 1800; // Hop
                    }
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

