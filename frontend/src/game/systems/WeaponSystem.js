import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';

export default class WeaponSystem {
    constructor(scene, owner, visual = null) {
        this.scene = scene;
        this.owner = owner;
        this.visual = visual;

        // Projectile group with Zero Gravity
        this.bullets = this.scene.physics.add.group({
            classType: Phaser.Physics.Arcade.Image,
            runChildUpdate: true,
            allowGravity: false // DISABLE GRAVITY FOR ALL BULLETS
        });

        // Tactical Archetypes
        this.weaponData = {
            pistol: { name: 'Pistol', damage: 15, range: 1100, muzzleSpeed: 1000, fireRate: 400, magSize: 12, reloadTime: 1500, color: 0xffffff, key: 'pistol', sound: 'pistol_sound' },
            smg: { name: 'SMG', damage: 8, range: 1400, muzzleSpeed: 1200, fireRate: 80, magSize: 30, reloadTime: 1500, spread: 0.08, color: 0x00ffff, key: 'smg', sound: 'pistol_sound' },
            rifle: { name: 'Rifle', damage: 20, range: 1600, muzzleSpeed: 1300, fireRate: 110, magSize: 20, reloadTime: 2000, spread: 0.08, color: 0x00ff00, key: 'rifle', sound: 'rifle_sound' },
            sniper: { name: 'Sniper', damage: 85, range: 16000, muzzleSpeed: 2500, fireRate: 1500, magSize: 5, reloadTime: 3500, isTracer: true, color: 0xff00ff, key: 'sniper', sound: 'sniper_sound' },
            shotgun: { name: 'Shotgun', damage: 10, range: 800, muzzleSpeed: 900, fireRate: 800, magSize: 6, reloadTime: 2000, pellets: 8, fanAngle: 15, spread: 0.3, color: 0xffff00, key: 'shotgun', sound: 'shotgun_sound' },
            launcher: { name: 'Launcher', damage: 100, range: 16000, muzzleSpeed: 828, fireRate: 2000, magSize: 3, reloadTime: 2500, isRocket: true, color: 0xff4500, key: 'launcher', sound: 'rocket-launcher_sound' },
            sarge_smg: { name: 'Sarge SMG', damage: 15, range: 6000, muzzleSpeed: 1200, fireRate: 110, magSize: 50, reloadTime: 2000, spread: 0.05, color: 0xffd700, key: 'sarge_smg', sound: 'rifle_sound' },
            dagger: { name: 'Dagger', damage: 35, range: 70, muzzleSpeed: 0, fireRate: 400, magSize: 999, reloadTime: 0, isMelee: true, color: 0xcccccc, key: 'dagger', sound: 'dagger_sound' },
            machinegun: { name: 'Machine Gun', damage: 20, range: 1600, muzzleSpeed: 1300, fireRate: 80, magSize: 100, reloadTime: 2500, spread: 0.12, color: 0x00ff88, key: 'machinegun', sound: 'rifle_sound' },
            tacticalshotgun: { name: 'Tactical Shotgun', damage: 8, range: 1000, muzzleSpeed: 1000, fireRate: 400, magSize: 10, reloadTime: 1500, pellets: 6, fanAngle: 15, spread: 0.2, color: 0xff8800, key: 'tacticalshotgun', sound: 'shotgun_sound' }
        };

        this.inventory = [null, null]; 
        this.currentSlot = 0;
        this.ammo = [
            { loaded: 0, reserve: 0 },
            { loaded: 0, reserve: 0 }
        ];

        this.isReloading = false;
        this.lastFired = 0;

        this.grenades = 3;
        this.grenadeGroup = this.scene.physics.add.group({
            defaultKey: 'white_square',
            classType: Phaser.Physics.Arcade.Image,
            allowGravity: true
        });
    }

    getCurrentWeapon() {
        const key = this.inventory[this.currentSlot];
        if (!key) return null;
        return this.weaponData[key];
    }

    fire(targetX, targetY) {
        const wp = this.getCurrentWeapon();
        if (!wp || this.isReloading) return; 
        
        const now = this.scene.time.now;
        if (now < this.lastFired + wp.fireRate) return;

        // Melee logic bypasses ammo
        if (wp.isMelee) {
            this.lastFired = now;
            this.performMelee(targetX, targetY, wp);
            return;
        }

        if (this.ammo[this.currentSlot].loaded <= 0) {
            this.reload();
            return;
        }

        const isPlayer = this.scene.player && this.owner === this.scene.player.sprite;
        if (!isPlayer || !useGameStore.getState().godMode) {
            this.ammo[this.currentSlot].loaded--;
        }
        this.lastFired = now;

        const startX = this.owner.x;
        const startY = this.owner.y;
        const baseAngle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);

        const currentWpKey = this.inventory[this.currentSlot];
        if (currentWpKey && currentWpKey.includes('shotgun')) {
            // FIXED GEOMETRIC FAN (30 degrees)
            const spreadRad = Phaser.Math.DegToRad(wp.fanAngle);
            const step = spreadRad / (wp.pellets - 1);
            const startAngle = baseAngle - (spreadRad / 2);

            for (let i = 0; i < wp.pellets; i++) {
                const angle = startAngle + (step * i);
                const tx = startX + Math.cos(angle) * 2000;
                const ty = startY + Math.sin(angle) * 2000;
                this.spawnBullet(tx, ty, wp);
            }
        } else if (wp.spread > 0) {
            // DYNAMIC WOBBLE (SMG/RIFLE)
            const wobble = (Math.random() - 0.5) * wp.spread;
            const finalAngle = baseAngle + wobble;
            const tx = startX + Math.cos(finalAngle) * 2000;
            const ty = startY + Math.sin(finalAngle) * 2000;
            this.spawnBullet(tx, ty, wp);
        } else {
            this.spawnBullet(targetX, targetY, wp);
        }

        if (wp.sound) {
            this.scene.sound.play(wp.sound, { volume: 0.6 });
        }

        if (this.onFire) {
            this.onFire({ targetX, targetY, weapon: currentWpKey });
        }
    }

    performMelee(targetX, targetY, wp) {
        if (this.visual && this.visual.playMeleeAnimation) {
            this.visual.playMeleeAnimation();
        }
        this.scene.sound.play('dagger_sound', { volume: 0.5 });

        // Damage check (Local player hitting remote players)
        const startX = this.owner.x;
        const startY = this.owner.y;
        const angle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);

        if (this.scene.networkPlayers) {
            this.networkPlayersArray = Array.from(this.scene.networkPlayers.values());
            this.networkPlayersArray.forEach(np => {
                const dist = Phaser.Math.Distance.Between(startX, startY, np.container.x, np.container.y);
                if (dist < wp.range) {
                    const angleToEnemy = Phaser.Math.Angle.Between(startX, startY, np.container.x, np.container.y);
                    const diff = Math.abs(Phaser.Math.Angle.Wrap(angle - angleToEnemy));
                    if (diff < Math.PI / 3) {
                        if (this.onMeleeHit) this.onMeleeHit({ id: np.id, damage: wp.damage });
                    }
                }
            });
        }

        if (this.onMelee) {
            this.onMelee({ targetX, targetY });
        }
    }

    createExplosion(x, y, radius, damage, owner) {
        // VISUALS: Trigger immediately at the top
        const particles = this.scene.add.particles(x, y, 'explosion_part', {
            speed: { min: 100, max: 300 },
            lifespan: 600,
            scale: { start: 3, end: 0 },
            quantity: 40,
            blendMode: 'ADD',
            tint: 0xff00ff // Pink Blast
        });
        this.scene.time.delayedCall(600, () => particles.destroy());

        // Notify Scene for Network Sync
        if (this.scene.onExplosion) {
            this.scene.onExplosion({ x, y, radius, damage });
        }

        // Play Explosion Sound with Proximity Check
        if (this.scene.player && this.scene.player.sprite) {
            const dist = Phaser.Math.Distance.Between(x, y, this.scene.player.sprite.x, this.scene.player.sprite.y);
            if (dist < 1700) {
                const falloff = 1 - (dist / 1700);
                const volume = Math.max(0.1, 0.8 * falloff);
                this.scene.sound.play('missile-blast_sound', { volume });
            }
        }

        // Splash Damage Targets Check
        const targets = [];
        if (this.scene.enemies) targets.push(...this.scene.enemies.getChildren());
        if (this.scene.player) targets.push(this.scene.player);
        if (this.scene.sarge) targets.push(this.scene.sarge);

        targets.forEach(t => {
            if (!t) return;
            
            // SARGE FRIENDLY FIRE PROTECTION: Skip if owner is player and target is sarge
            if (owner === this.scene.player?.sprite && t === this.scene.sarge) return;

            // Determine the physics sprite and damage handler
            let targetSprite = null;
            let handler = null;

            if (t.sprite && t.sprite.active) { // Player or SargeAI class
                targetSprite = t.sprite;
                if (typeof t.takeDamage === 'function') {
                    handler = (dmg) => t.takeDamage(dmg);
                }
            } else if (t.id && t.container) { // NetworkPlayer class
                targetSprite = t.container;
                handler = (dmg) => {
                    if (this.scene.handlePvPHit) this.scene.handlePvPHit(t.id, dmg);
                };
            } else if (t.active) { // Raw Enemy sprite
                targetSprite = t;
                handler = (dmg) => {
                    t.health = (t.health || 50) - dmg;
                    if (t.health <= 0) {
                        // Correctly trigger enemy death via the scene logic
                        this.scene.bulletHitEnemy({ active: true, isRocket: false, damage: 0, owner: owner, destroy: () => {} }, t);
                    }
                };
            }

            if (!targetSprite || !handler) return;
            
            const dist = Phaser.Math.Distance.Between(x, y, targetSprite.x, targetSprite.y);
            const effectiveRadius = radius || 200; // Increased default radius

            if (dist < effectiveRadius) {
                // FLATTENED FALLOFF: 100% damage in the inner 60% (90px for 150px blast), then falloff to 0
                const innerRadius = effectiveRadius * 0.6;
                let finalDamage = damage;

                if (dist > innerRadius) {
                    const falloffDist = effectiveRadius - innerRadius;
                    const distInFalloff = dist - innerRadius;
                    const factor = 1 - (distInFalloff / falloffDist);
                    finalDamage = damage * factor;
                }

                handler(Math.max(0, finalDamage));
            }
        });
    }

    spawnBullet(targetX, targetY, weapon) {
        // Use Muzzle Position from Visual if available
        let spawnX = this.owner.x;
        let spawnY = this.owner.y;

        if (this.visual && this.visual.getMuzzlePosition) {
            const muzzle = this.visual.getMuzzlePosition();
            spawnX = muzzle.x;
            spawnY = muzzle.y;
        }

        const bullet = this.bullets.get(spawnX, spawnY, 'bullet_player');
        if (bullet) {
            bullet.setActive(true).setVisible(true);
            bullet.setPosition(spawnX, spawnY);
            
            if (bullet.body) {
                bullet.body.reset(spawnX, spawnY);
                bullet.body.setAllowGravity(false); // ENSURE NO GRAVITY
                bullet.body.setSize(weapon.isRocket ? 16 : 8, 8);
            }

            bullet.damage = weapon.damage;
            bullet.owner = this.owner;
            bullet.setTint(weapon.projectileColor || weapon.color);

            const angle = Phaser.Math.Angle.Between(this.owner.x, this.owner.y, targetX, targetY);
            
            // USE NEW BULLET PNG FOR SPECIFIC GUNS
            const useBulletPng = ['pistol', 'rifle', 'smg', 'machinegun', 'sarge_smg'].includes(weapon.key);
            if (useBulletPng) {
                bullet.setTexture('bullet');
                bullet.setRotation(angle + Math.PI); // Faces Left in PNG, so add 180 deg
                bullet.setDisplaySize(20, 10);
            } else {
                bullet.setRotation(angle);
            }

            if (weapon.isRocket) {
                bullet.setRotation(angle);
                bullet.setTexture('rocket');
                bullet.setDisplaySize(45, 22); // LARGER ROCKET
                bullet.setTint(0xffffff); // Clear tint for sprite
                
                // Rocket collision logic override
                bullet.isRocket = true;
                bullet.onImpact = () => {
                    this.createExplosion(bullet.x, bullet.y, 150, weapon.damage, this.owner);
                    bullet.destroy();
                };
            }

            // SNIPER TRACER EFFECT (With Wall Detection & Instant Damage)
            if (weapon.isTracer) {
                bullet.setVisible(false);
                const line = this.scene.add.graphics();
                line.lineStyle(2, 0xffffff, 0.8);
                
                let endX = this.owner.x + Math.cos(angle) * weapon.range;
                let endY = this.owner.y + Math.sin(angle) * weapon.range;
                
                const step = 10; // High precision
                for (let d = 0; d < weapon.range; d += step) {
                    const px = this.owner.x + Math.cos(angle) * d;
                    const py = this.owner.y + Math.sin(angle) * d;
                    
                    const hitWall = this.scene.platforms?.getTileAtWorldXY(px, py);
                    const hitEnemy = this.scene.enemies?.getChildren().find(e => e.active && !e.isDying && e.getBounds().contains(px, py));
                    const hitPlayer = this.scene.player?.sprite.active && this.scene.player.sprite.getBounds().contains(px, py);
                    const hitSarge = this.scene.sarge?.sprite.active && this.scene.sarge.sprite.getBounds().contains(px, py);

                    if (hitWall || hitEnemy || (hitPlayer && this.owner !== this.scene.player.sprite) || (hitSarge && this.owner !== this.scene.sarge.sprite)) {
                        endX = px;
                        endY = py;
                        
                        // APPLY INSTANT DAMAGE
                        if (hitEnemy) {
                            this.scene.bulletHitEnemy(bullet, hitEnemy);
                        } else if (hitPlayer && this.owner !== this.scene.player.sprite) {
                            this.scene.enemyBulletHitPlayer(this.scene.player.sprite, bullet);
                        } else if (hitSarge && this.owner !== this.scene.sarge.sprite) {
                            // Sarge takes damage like player for consistency
                            this.scene.enemyBulletHitPlayer(this.scene.sarge.sprite, bullet);
                        }
                        
                        bullet.destroy(); // Destroy immediately after instant hit
                        break;
                    }
                }
                
                line.lineBetween(this.owner.x, this.owner.y, endX, endY);
                this.scene.tweens.add({
                    targets: line,
                    alpha: 0,
                    duration: 150,
                    onComplete: () => line.destroy()
                });
            } else {
                this.scene.physics.moveTo(bullet, targetX, targetY, weapon.muzzleSpeed);
            }

            // Lifetime management
            if (bullet.rangeTimer) {
                bullet.rangeTimer.remove();
            }
            const travelTime = (weapon.range / weapon.muzzleSpeed) * 1000;
            bullet.rangeTimer = this.scene.time.delayedCall(travelTime, () => {
                if (bullet && bullet.active) {
                    if (bullet.isRocket) bullet.onImpact();
                    else bullet.destroy();
                }
            });
        }
    }

    throwGrenade(targetX, targetY) {
        if (this.grenades <= 0) return;
        const isPlayer = this.scene.player && this.owner === this.scene.player.sprite;
        if (!isPlayer || !useGameStore.getState().godMode) {
            this.grenades--;
        }

        const throwAngle = Phaser.Math.Angle.Between(this.owner.x, this.owner.y, targetX, targetY);
        const spawnX = this.owner.x + Math.cos(throwAngle) * 45;
        const spawnY = this.owner.y + Math.sin(throwAngle) * 45;

        const grenade = this.grenadeGroup.get(spawnX, spawnY, 'grenade');
        if (grenade) {
            grenade.setTexture('grenade');
            grenade.setActive(true).setVisible(true).setTint(0xffffff); // Clear tint
            grenade.setDisplaySize(24, 24); // LARGER GRENADE
            grenade.setPosition(spawnX, spawnY);

            if (grenade.body) {
                grenade.body.reset(spawnX, spawnY);
                grenade.body.setBounce(0.7); // Bouncier
                grenade.body.setDrag(120, 0);
                grenade.body.setAngularVelocity(Phaser.Math.Between(200, 400) * (targetX < spawnX ? -1 : 1));
                grenade.body.setAllowGravity(true);
                
                // Calculate velocity towards target + parent momentum
                // Added a slight upward arc bias (-0.15 rad) for a more natural feel
                const angle = Phaser.Math.Angle.Between(spawnX, spawnY, targetX, targetY) - 0.15;
                const throwStrength = 750; // Increased strength
                
                const vx = Math.cos(angle) * throwStrength + (this.owner.body ? this.owner.body.velocity.x : 0);
                const vy = Math.sin(angle) * throwStrength + (this.owner.body ? this.owner.body.velocity.y : 0);
                
                grenade.body.setVelocity(vx, vy);
            }

            // Fuse (Reduced to 2.5s)
            this.scene.time.delayedCall(2500, () => {
                if (grenade.active) {
                    this.createExplosion(grenade.x, grenade.y, 150, 100, this.owner);
                    
                    // Proximity Sound for Grenade specifically (optional if already handled by createExplosion)
                    if (this.scene.player && this.scene.player.sprite) {
                        const dist = Phaser.Math.Distance.Between(grenade.x, grenade.y, this.scene.player.sprite.x, this.scene.player.sprite.y);
                        if (dist < 1700) {
                            const falloff = 1 - (dist / 1700);
                            const volume = Math.max(0.1, 0.8 * falloff);
                            this.scene.sound.play('granade_sound', { volume });
                        }
                    }
                    grenade.destroy();
                }
            });
        }
    }

    reload() {
        const wp = this.getCurrentWeapon();
        const slotAmmo = this.ammo[this.currentSlot];
        if (!wp || this.isReloading || slotAmmo.reserve <= 0 || slotAmmo.loaded === wp.magSize) return;

        this.isReloading = true;
        this.scene.sound.play('reload_sound', { volume: 0.7 });
        
        this.scene.time.delayedCall(wp.reloadTime, () => {
            const needed = wp.magSize - slotAmmo.loaded;
            const take = Math.min(needed, slotAmmo.reserve);
            
            slotAmmo.loaded += take;
            slotAmmo.reserve -= take;
            this.isReloading = false;
        });
    }

    switchSlot(slotIndex) {
        if (this.isReloading) return;
        this.currentSlot = slotIndex;
        return this.getCurrentWeapon();
    }

    addWeapon(weaponKey, ammoData = null) {
        const wp = this.weaponData[weaponKey];
        if (!wp) return;

        // Check if we already have it to refill ammo
        for (let i = 0; i < 2; i++) {
            if (this.inventory[i] === weaponKey) {
                const addAmount = ammoData ? (ammoData.loaded + ammoData.reserve) : (wp.magSize * 2);
                this.ammo[i].reserve += addAmount;
                return true;
            }
        }

        // Fill empty slot
        for (let i = 0; i < 2; i++) {
            if (this.inventory[i] === null) {
                this.inventory[i] = weaponKey;
                
                // Smart Ammo Check: Handle both numbers and objects
                if (typeof ammoData === 'number') {
                    this.ammo[i].loaded = wp.magSize;
                    this.ammo[i].reserve = ammoData;
                } else if (ammoData && typeof ammoData === 'object') {
                    this.ammo[i] = { ...ammoData };
                } else {
                    this.ammo[i].loaded = wp.magSize;
                    this.ammo[i].reserve = wp.magSize * 2;
                }
                return true;
            }
        }

        return false; // Both slots full
    }

    dropCurrentWeapon() {
        if (this.inventory[this.currentSlot] === null) return null;
        
        const droppedKey = this.inventory[this.currentSlot];
        const droppedAmmo = { ...this.ammo[this.currentSlot] };

        this.inventory[this.currentSlot] = null;
        this.ammo[this.currentSlot] = { loaded: 0, reserve: 0 };
        
        return { key: droppedKey, ammo: droppedAmmo };
    }

    resetInventory() {
        this.inventory = [null, null];
        this.ammo = [
            { loaded: 0, reserve: 0 },
            { loaded: 0, reserve: 0 }
        ];
        this.isReloading = false;
        this.currentSlot = 0;
        this.grenades = 3;
    }
}

