import Phaser from 'phaser';
import WeaponSystem from '../systems/WeaponSystem';
import CharacterAssembler from '../utils/CharacterAssembler';
import { useGameStore } from '../../store/gameStore';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        // 1. Create the Visual Assembly
        this.visual = new CharacterAssembler(scene, { type: 'player' });

        // 2. Create an invisible Physics Sprite for collision (The Hitbox)
        // We use a separate sprite so the container can flip and animate freely
        this.sprite = this.scene.physics.add.sprite(x, y, 'white_square');
        this.sprite.body.setSize(30, 50);
        this.sprite.setVisible(false); // Invisible hitbox
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setDragX(800);

        // State
        this.health = 100;
        this.fuel = 100;
        this.maxFuel = 100;
        this.isCrouching = false;
        this.isRespawning = false;
        this.lastDamageTime = 0;

        // Systems
        this.weapons = new WeaponSystem(scene, this.sprite, this.visual);

        // Inputs mapping
        this.keys = this.scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            interact: Phaser.Input.Keyboard.KeyCodes.F,
            reload: Phaser.Input.Keyboard.KeyCodes.R,
            grenade: Phaser.Input.Keyboard.KeyCodes.G,
            slot1: Phaser.Input.Keyboard.KeyCodes.ONE,
            slot2: Phaser.Input.Keyboard.KeyCodes.TWO
        });

        // Event Listeners
        this.scene.input.keyboard.on('keydown-ONE', () => this.switchSlot(0));
        this.scene.input.keyboard.on('keydown-TWO', () => this.switchSlot(1));
        this.scene.input.keyboard.on('keydown-F', () => this.handlePickup());
        this.scene.input.keyboard.on('keydown-R', () => this.weapons.reload());
        this.scene.input.keyboard.on('keydown-G', () => this.throwGrenade());

        // Mouse Wheel Switching
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            const nextSlot = (this.weapons.currentSlot + (deltaY > 0 ? 1 : -1) + 2) % 2;
            this.switchSlot(nextSlot);
        });

        // Mouse click for shooting + Force Focus
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown()) this.isShooting = true;
            // Ensure keyboard is focused
            if (this.scene.input.keyboard) this.scene.input.keyboard.enabled = true;
        });
        this.scene.input.on('pointerup', () => {
            this.isShooting = false;
        });

        // 3. Jetpack Particles
        this.jetpackParticles = this.scene.add.particles(0, 0, 'bullet_player', {
            speed: { min: 50, max: 150 },
            angle: { min: 80, max: 100 },
            scale: { start: 1.5, end: 0 },
            lifespan: 400,
            gravityY: 400,
            frequency: -1, // Manually controlled
            tint: 0xffaa44,
            blendMode: 'ADD'
        });
        this.jetpackParticles.setDepth(5);

        // 4. Laser Sight Graphics
        this.laserGraphics = this.scene.add.graphics();
        this.laserGraphics.setDepth(4);
    }

    update(time, delta, pointer) {
        if (!this.sprite || !this.sprite.body || !this.sprite.active || this.isRespawning) return;

        // Sync visual with physics body - Locked Standing Offset
        this.visual.container.setPosition(this.sprite.x, this.sprite.y + 10);

        this.handleMovement(delta);
        this.handleCombat();
        this.handleHealthRegen(time);
        this.syncUI();

        // Update visual animations & Weapon Color
        const currentWpKey = this.weapons.inventory[this.weapons.currentSlot];
        this.visual.update(time, delta, this.sprite.body.velocity.x, false, currentWpKey, this.weapons.grenades);

        // Handle aiming with mouse pointer
        if (pointer) {
            const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.visual.aimAt(worldPoint.x, worldPoint.y);
        }

        this.updateLaserSight();
    }

    handleMovement(delta) {
        const isOnGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
        
        // DYNAMIC PHYSICS: More drag on ground for stopping, less in air for drifting
        const accel = isOnGround ? 1000 : 1800; // Increased air accel for flexibility (was 1200)
        const drag = isOnGround ? 800 : 150; // Slightly less drag in air (was 200)
        const maxSpeed = isOnGround ? 500 : 650; // Faster air horizontal speed

        this.sprite.body.setMaxVelocity(maxSpeed, 1200);
        this.sprite.body.setDragX(drag);

        // Horizontal Movement (Acceleration-based for "Drift" feel)
        if (this.keys.left.isDown) {
            this.sprite.setAccelerationX(-accel);
        } else if (this.keys.right.isDown) {
            this.sprite.setAccelerationX(accel);
        } else {
            this.sprite.setAccelerationX(0);
        }

        // Jetpack / Jump (Mini Militia Style)
        const isJumping = this.keys.space.isDown || this.keys.up.isDown;
        
        if (isJumping && this.fuel > 0) {
            this.sprite.setAccelerationY(-2000);
            this.fuel = Math.max(0, this.fuel - (delta * 0.0066));
            
            // Particles - LOWERED POSITION (y + 55)
            this.jetpackParticles.emitParticleAt(this.sprite.x, this.sprite.y + 55);
        } else if (this.keys.down.isDown && !isOnGround && this.fuel > 0) {
            // DOWNWARD THRUST (Air flexibility - Reduced by 45% as requested)
            this.sprite.setAccelerationY(1100); 
            this.fuel = Math.max(0, this.fuel - (delta * 0.0066));
        } else {
            this.sprite.setAccelerationY(0);
            
            // Recharge fuel
            if (isOnGround) {
                this.fuel = Math.min(this.maxFuel, this.fuel + (delta * 0.02));
            } else {
                this.fuel = Math.min(this.maxFuel, this.fuel + (delta * 0.002));
            }
        }
    }

    handleCombat() {
        if (this.isShooting) {
            const pointer = this.scene.input.activePointer;
            // Get the precise world point from the camera to ensure aiming matches the cursor
            const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this.weapons.fire(worldPoint.x, worldPoint.y);
        }
    }

    switchSlot(index) {
        this.weapons.switchSlot(index);
    }

    handlePickup() {
        const pickups = this.scene.weaponPickups;
        if (!pickups) return;

        let nearest = null;
        let minDist = 80; // Slightly larger range for easier pickup

        pickups.getChildren().forEach((p) => {
            const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, p.x, p.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = p;
            }
        });

        if (nearest) {
            // Trigger Respawn Timer if it was a permanent map item
            if (nearest.isPermanent) {
                this.scene.handleLootPickup(nearest.pointIndex);
            }

            // GRENADE PICKUP
            if (nearest.weaponKey === 'grenade') {
                this.weapons.grenades += 3;
                if (this.scene.notifyPickup) this.scene.notifyPickup(nearest.lootId);
                nearest.destroy();
                return;
            }

            // MEDKIT PICKUP
            if (nearest.weaponKey === 'medkit') {
                this.health = 100;
                this.syncUI();
                if (this.scene.notifyPickup) this.scene.notifyPickup(nearest.lootId);
                nearest.destroy();
                return;
            }

            // 1. Check if we already have this weapon in ANY slot
            const duplicateSlot = this.weapons.inventory.indexOf(nearest.weaponKey);

            if (duplicateSlot !== -1) {
                // It's a duplicate! Just add ammo and destroy pickup
                this.weapons.addWeapon(nearest.weaponKey, nearest.ammo);
                if (this.scene.notifyPickup) this.scene.notifyPickup(nearest.lootId);
                nearest.destroy();
                return;
            }

            // 2. If it's a NEW weapon, handle swapping if the current slot is full
            const currentKey = this.weapons.inventory[this.weapons.currentSlot];
            if (currentKey) {
                const dropped = this.weapons.dropCurrentWeapon();
                // Pass the actual ammo state of the dropped gun
                this.scene.spawnWeaponPickup(this.sprite.x, this.sprite.y - 20, dropped.key, dropped.ammo, false);
            }

            this.weapons.addWeapon(nearest.weaponKey, nearest.ammo);
            if (this.scene.notifyPickup) this.scene.notifyPickup(nearest.lootId);
            nearest.destroy();
        }
    }

    throwGrenade() {
        const pointer = this.scene.input.activePointer;
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.weapons.throwGrenade(worldPoint.x, worldPoint.y);
    }

    handleHealthRegen(time) {
        if (this.health < 100 && time > this.lastDamageTime + 5000) {
            this.health = Math.min(100, this.health + 0.1);
        }
    }

    takeDamage(amount) {
        if (this.isRespawning) return;
        if (useGameStore.getState().godMode) return; // God Mode Protection
        
        this.health = Math.max(0, this.health - amount);
        this.syncUI();
        this.lastDamageTime = this.scene.time.now;

        if (this.health <= 0) {
            this.visual.explode();
            this.sprite.setActive(false).setVisible(false);
            this.scene.onPlayerDeath();
        }
    }

    syncUI() {
        const store = useGameStore.getState();
        store.setPlayerHealth(this.health);
        store.setPlayerFuel(this.fuel);
        store.setGrenades(this.weapons.grenades);

        const slotAmmo = this.weapons.ammo[this.weapons.currentSlot];
        if (this.weapons.inventory[this.weapons.currentSlot]) {
            store.setAmmo(slotAmmo.loaded, slotAmmo.reserve);
        } else {
            store.setAmmo(0, 0); // Show 0/0 for empty hands
        }
    }

    updateLaserSight() {
        this.laserGraphics.clear();
        
        const currentWeapon = this.weapons.inventory[this.weapons.currentSlot];
        if (currentWeapon !== 'sniper' && currentWeapon !== 'launcher') return;

        const muzzle = this.visual.getMuzzlePosition();
        const pointer = this.scene.input.activePointer;
        const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const angle = Phaser.Math.Angle.Between(muzzle.x, muzzle.y, worldPoint.x, worldPoint.y);

        const wpData = this.weapons.weaponData[currentWeapon];
        const maxRange = wpData ? wpData.range : 2000;
        let endX = muzzle.x + Math.cos(angle) * maxRange;
        let endY = muzzle.y + Math.sin(angle) * maxRange;

        // Raycast for collisions
        const step = 10;
        for (let d = 0; d < maxRange; d += step) {
            const px = muzzle.x + Math.cos(angle) * d;
            const py = muzzle.y + Math.sin(angle) * d;

            const hitWall = this.scene.platformLayer.getTileAtWorldXY(px, py, true)?.canCollide;
            // Check enemies
            const hitEnemy = this.scene.enemies.getChildren().find(e => e.active && e.getBounds().contains(px, py));

            if (hitWall || hitEnemy) {
                endX = px;
                endY = py;
                break;
            }
        }

        // Draw the laser
        this.laserGraphics.lineStyle(1.5, 0xff0000, 0.5); // Thin red semi-transparent laser
        this.laserGraphics.lineBetween(muzzle.x, muzzle.y, endX, endY);
        
        // Impact point dot
        this.laserGraphics.fillStyle(0xff0000, 0.8);
        this.laserGraphics.fillCircle(endX, endY, 3);
    }
}
