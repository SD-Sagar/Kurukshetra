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
        this.sprite = this.scene.physics.add.sprite(x, y, null);
        this.sprite.body.setSize(40, 80);
        this.sprite.setVisible(false); // Invisible hitbox
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setDragX(800);

        // State
        this.health = 100;
        this.fuel = 100;
        this.maxFuel = 100;
        this.isCrouching = false;
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

        // Mouse click for shooting
        this.scene.input.on('pointerdown', (pointer) => {
            if (pointer.leftButtonDown()) this.isShooting = true;
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
    }

    update(time, delta, pointer) {
        if (!this.sprite || !this.sprite.active || !this.sprite.body) return;

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
    }

    handleMovement(delta) {
        const accel = 1000; 
        const drag = 600;
        const maxSpeed = 500;

        this.sprite.body.setMaxVelocity(maxSpeed, 1000);
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
            
            // Particles
            this.jetpackParticles.emitParticleAt(this.sprite.x, this.sprite.y + 40);
        } else {
            this.sprite.setAccelerationY(0);
            
            // Recharge fuel
            const isOnGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
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
                nearest.destroy();
                return;
            }

            // 1. Check if we already have this weapon in ANY slot
            const duplicateSlot = this.weapons.inventory.indexOf(nearest.weaponKey);

            if (duplicateSlot !== -1) {
                // It's a duplicate! Just add ammo and destroy pickup
                this.weapons.addWeapon(nearest.weaponKey, nearest.ammo);
                nearest.destroy();
                return;
            }

            // 2. If it's a NEW weapon, handle swapping if the current slot is full
            const currentKey = this.weapons.inventory[this.weapons.currentSlot];
            if (currentKey) {
                const dropped = this.weapons.dropCurrentWeapon();
                // Toss the weapon slightly so it doesn't clip (Dropped weapons are temporary)
                this.scene.spawnWeaponPickup(this.sprite.x, this.sprite.y - 20, dropped.key, dropped.ammo, false);
            }

            this.weapons.addWeapon(nearest.weaponKey, nearest.ammo);
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
        this.health = Math.max(0, this.health - amount);
        this.lastDamageTime = this.scene.time.now;

        if (this.health <= 0) {
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
}
