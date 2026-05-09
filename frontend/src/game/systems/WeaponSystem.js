import Phaser from 'phaser';

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
            pistol: { name: 'Pistol', damage: 15, range: 2000, muzzleSpeed: 1000, fireRate: 400, magSize: 12, reloadTime: 1500, color: 0xffffff, key: 'pistol' },
            smg: { name: 'SMG', damage: 12, range: 4000, muzzleSpeed: 1200, fireRate: 100, magSize: 30, reloadTime: 2000, spread: 0.08, color: 0x00ffff, key: 'smg' },
            rifle: { name: 'Rifle', damage: 20, range: 8000, muzzleSpeed: 1300, fireRate: 100, magSize: 20, reloadTime: 2500, spread: 0.08, color: 0x00ff00, key: 'rifle' },
            sniper: { name: 'Sniper', damage: 85, range: 16000, muzzleSpeed: 2500, fireRate: 1500, magSize: 5, reloadTime: 3500, isTracer: true, color: 0xff00ff, key: 'sniper' },
            shotgun: { name: 'Shotgun', damage: 10, range: 800, muzzleSpeed: 900, fireRate: 800, magSize: 6, reloadTime: 2500, pellets: 8, fanAngle: 30, spread: 0.3, color: 0xffff00, key: 'shotgun' },
            launcher: { name: 'Launcher', damage: 100, range: 16000, muzzleSpeed: 600, fireRate: 2000, magSize: 3, reloadTime: 3000, isRocket: true, color: 0xff4500, key: 'launcher' },
            sarge_smg: { name: 'Sarge SMG', damage: 15, range: 6000, muzzleSpeed: 1200, fireRate: 120, magSize: 50, reloadTime: 2000, spread: 0.05, color: 0xffd700, key: 'sarge_smg' }
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

        if (this.ammo[this.currentSlot].loaded <= 0) {
            this.reload();
            return;
        }

        this.ammo[this.currentSlot].loaded--;
        this.lastFired = now;

        const startX = this.owner.x;
        const startY = this.owner.y;
        const baseAngle = Phaser.Math.Angle.Between(startX, startY, targetX, targetY);

        if (this.inventory[this.currentSlot] === 'shotgun') {
            // FIXED GEOMETRIC FAN (30 degrees)
            const spreadRad = Phaser.Math.DegToRad(wp.fanAngle);
            const step = spreadRad / (wp.pellets - 1);
            const startAngle = baseAngle - (spreadRad / 2);

            for (let i = 0; i < wp.pellets; i++) {
                const angle = startAngle + (step * i);
                const tx = startX + Math.cos(angle) * 100;
                const ty = startY + Math.sin(angle) * 100;
                this.spawnBullet(tx, ty, wp);
            }
        } else if (wp.spread > 0) {
            // DYNAMIC WOBBLE (SMG/RIFLE)
            const wobble = (Math.random() - 0.5) * wp.spread;
            const finalAngle = baseAngle + wobble;
            const tx = startX + Math.cos(finalAngle) * 100;
            const ty = startY + Math.sin(finalAngle) * 100;
            this.spawnBullet(tx, ty, wp);
        } else {
            this.spawnBullet(targetX, targetY, wp);
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
            } else if (t.active) { // Raw Enemy sprite
                targetSprite = t;
                handler = (dmg) => {
                    t.health = (t.health || 50) - dmg;
                    if (t.health <= 0) {
                        // Correctly trigger enemy death via the scene logic
                        this.scene.bulletHitEnemy({ active: true, isRocket: false, damage: 0, destroy: () => {} }, t);
                    }
                };
            }

            if (!targetSprite || !handler) return;
            
            const dist = Phaser.Math.Distance.Between(x, y, targetSprite.x, targetSprite.y);
            if (dist < radius) {
                const falloff = 1 - (dist / radius);
                const finalDamage = Math.max(0, damage * falloff);
                handler(finalDamage);
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
            if (weapon.isRocket) {
                bullet.setRotation(angle);
                bullet.setTexture('rocket');
                bullet.setDisplaySize(30, 15);
                bullet.setTint(0xffffff); // Clear tint for sprite
                
                // Rocket collision logic override
                bullet.isRocket = true;
                bullet.onImpact = () => {
                    this.createExplosion(bullet.x, bullet.y, 150, weapon.damage, this.owner);
                    bullet.destroy();
                };
            }

            // SNIPER TRACER EFFECT (With Wall Detection)
            if (weapon.isTracer) {
                bullet.setVisible(false);
                const line = this.scene.add.graphics();
                line.lineStyle(2, 0xffffff, 0.8);
                
                // Manual Raycast to find wall hit
                let endX = this.owner.x + Math.cos(angle) * weapon.range;
                let endY = this.owner.y + Math.sin(angle) * weapon.range;
                
                if (this.scene.platforms || this.scene.enemies) {
                    const step = 20;
                    for (let d = 0; d < weapon.range; d += step) {
                        const px = this.owner.x + Math.cos(angle) * d;
                        const py = this.owner.y + Math.sin(angle) * d;
                        
                        // Check Walls
                        const hitWall = this.scene.platforms?.getTileAtWorldXY(px, py);
                        // Check Enemies
                        const hitEnemy = this.scene.enemies?.getChildren().find(e => e.getBounds().contains(px, py));
                        
                        if (hitWall || hitEnemy) {
                            endX = px;
                            endY = py;
                            break;
                        }
                    }
                }
                
                line.lineBetween(this.owner.x, this.owner.y, endX, endY);
                this.scene.tweens.add({
                    targets: line,
                    alpha: 0,
                    duration: 150,
                    onComplete: () => line.destroy()
                });
                
                this.scene.physics.moveTo(bullet, endX, endY, weapon.muzzleSpeed);
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
        this.grenades--;

        const spawnX = this.owner.x;
        const spawnY = this.owner.y;

        const grenade = this.grenadeGroup.get(spawnX, spawnY, 'grenade');
        if (grenade) {
            grenade.setTexture('grenade');
            grenade.setActive(true).setVisible(true).setTint(0xffffff); // Clear tint
            grenade.setDisplaySize(16, 16);
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

            // Fuse
            this.scene.time.delayedCall(3000, () => {
                if (grenade.active) {
                    this.createExplosion(grenade.x, grenade.y, 150, 100, this.owner);
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
}

