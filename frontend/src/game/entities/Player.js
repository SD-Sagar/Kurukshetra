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
        const moveSpeed = 300; 

        // Horizontal Movement
        if (this.keys.left.isDown) {
            this.sprite.setVelocityX(-moveSpeed);
        } else if (this.keys.right.isDown) {
            this.sprite.setVelocityX(moveSpeed);
        } else {
            this.sprite.setVelocityX(0);
        }

        // Jetpack / Jump (15-second duration)
        if (this.keys.space.isDown || this.keys.up.isDown) {
            if (this.fuel > 0) {
                this.sprite.setAccelerationY(-2000);
                this.fuel = Math.max(0, this.fuel - (delta * 0.0066));
            } else {
                this.sprite.setAccelerationY(0);
            }
        } else {
            this.sprite.setAccelerationY(0);
            // Recharge fuel
            // We check both 'touching' (objects) and 'blocked' (tiles/world bounds)
            const isOnGround = this.sprite.body.touching.down || this.sprite.body.blocked.down;
            
            if (isOnGround) {
                // Rapid recharge on ground (Full in ~5 seconds)
                this.fuel = Math.min(this.maxFuel, this.fuel + (delta * 0.02));
            } else {
                // Slow "air-drip" recharge while falling (Full in ~50 seconds)
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
                // Toss the weapon slightly so it doesn't clip
                this.scene.spawnWeaponPickup(this.sprite.x, this.sprite.y - 20, dropped.key, dropped.ammo);
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
        this.health = Math.max(0, this.health - amount);
        this.lastDamageTime = this.scene.time.now;
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
