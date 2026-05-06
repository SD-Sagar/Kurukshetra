import Phaser from 'phaser';

export default class CharacterAssembler {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config; 
        this.type = config.type;

        this.container = this.scene.add.container(0, 0);
        this.baseScale = 0.5;
        this.container.setScale(this.baseScale);

        const prefix = this.type === 'player' ? 'player' : (this.type === 'sarge' ? 'sarge' : 'enemy');

        this.legBack = this.scene.add.sprite(-8, 20, `${prefix}_leg`);
        this.legFront = this.scene.add.sprite(8, 20, `${prefix}_leg`);
        this.torso = this.scene.add.sprite(0, 0, `${prefix}_torso`);
        this.armBack = this.scene.add.sprite(-15, -5, `${prefix}_arm`);
        this.armFront = this.scene.add.sprite(15, -5, `${prefix}_arm`);
        
        this.weapon = this.scene.add.sprite(0, 0, 'pistol');
        this.weapon.setOrigin(0.9, 0.5); // Grip by the handle side
        this.weapon.setVisible(false);
        this.head = this.scene.add.sprite(0, -35, `${prefix}_head`);
        
        // Grenade Belt (Visual Only)
        this.grenadeBelt = this.scene.add.sprite(0, 15, 'grenade');
        this.grenadeBelt.setDisplaySize(15, 15);
        this.grenadeBelt.setVisible(this.type === 'player');

        this.head.setOrigin(0.5, 0.95); 
        this.armFront.setOrigin(0.5, 0.1); 
        this.armBack.setOrigin(0.5, 0.1);
        this.legFront.setOrigin(0.5, 0); 
        this.legBack.setOrigin(0.5, 0);

        this.container.add([
            this.legBack,
            this.armBack,
            this.torso,
            this.legFront,
            this.armFront,
            this.weapon,
            this.grenadeBelt,
            this.head
        ]);

        this.walkCycle = 0;
        this.currentWeaponColor = null;
    }

    update(time, delta, velocityX, isCrouching = false, weaponColor = null) {
        const prefix = this.type === 'player' ? 'player' : (this.type === 'sarge' ? 'sarge' : 'enemy');
        this.currentWeaponColor = weaponColor;

        if (weaponColor !== null) {
            this.weapon.setVisible(true);
            // Dynamic Sprite Swap: key is passed as a string now (e.g., 'pistol')
            const weaponKey = this.scene.player?.weapons.inventory[this.scene.player?.weapons.currentSlot] || 'pistol';
            
            // For enemies/Sarge, we might need a different way to know their current weapon key
            // Let's assume we pass the weaponKey instead of weaponColor to update
            if (typeof weaponColor === 'string') {
                 this.weapon.setTexture(weaponColor);
            } else {
                 // Fallback to pistol if color is passed but we need a sprite
                 // Ideally we update the call site to pass the key
            }
        } else {
            this.weapon.setVisible(false);
        }

        if (isCrouching) {
            this.legFront.setTexture(`${prefix}_leg_bend`);
            this.legBack.setTexture(`${prefix}_leg_bend`);
            this.armBack.y = 7;
            this.grenadeBelt.y = 27; // Shift down while crouching
        } else {
            this.torso.y = 0;
            this.head.y = -35;
            this.armFront.y = -5;
            this.armBack.y = -5;
            this.grenadeBelt.y = 15;

            if (Math.abs(velocityX) > 10) {
                this.walkCycle += delta * 0.015;
                const swing = Math.sin(this.walkCycle) * 25;
                this.legFront.setAngle(swing);
                this.legBack.setAngle(-swing);

                if (weaponColor === null) {
                    this.armFront.setAngle(swing * 0.2);
                    this.armBack.setAngle(-swing * 0.2);
                }

                if (Math.abs(swing) > 12) {
                    this.legFront.setTexture(`${prefix}_leg_bend`);
                    this.legBack.setTexture(`${prefix}_leg`);
                } else {
                    this.legFront.setTexture(`${prefix}_leg`);
                    this.legBack.setTexture(`${prefix}_leg_bend`);
                }
            } else {
                this.legFront.setAngle(0);
                this.legBack.setAngle(0);
                this.legFront.setTexture(`${prefix}_leg`);
                this.legBack.setTexture(`${prefix}_leg`);
                if (weaponColor === null) {
                    this.armFront.setAngle(0);
                    this.armBack.setAngle(0);
                }
            }
        }
    }

    aimAt(targetX, targetY) {
        // COORDINATE SYSTEM FIX:
        // Instead of using world coordinates which can lag or glitch with camera scroll,
        // we use the screen position of the player and the screen position of the mouse.
        const cam = this.scene.cameras.main;
        
        // Convert player container position to Screen Space
        const playerScreenX = (this.container.x - cam.scrollX) * cam.zoom;
        const playerScreenY = (this.container.y - cam.scrollY) * cam.zoom;
        
        // Get mouse position in Screen Space
        const mouseX = this.scene.input.activePointer.x;
        const mouseY = this.scene.input.activePointer.y;

        const angle = Phaser.Math.Angle.Between(playerScreenX, playerScreenY, mouseX, mouseY);
        
        // Horizontal Flipping Logic
        if (mouseX < playerScreenX) {
            this.container.setScale(-this.baseScale, this.baseScale);
            const flippedRotation = -angle + Math.PI;
            this.armFront.rotation = flippedRotation - Math.PI/2;
            this.armBack.rotation = flippedRotation - Math.PI/2;
        } else {
            this.container.setScale(this.baseScale, this.baseScale);
            this.armFront.rotation = angle - Math.PI/2;
            this.armBack.rotation = angle - Math.PI/2;
        }

        // Sync weapon rotation
        if (this.currentWeaponColor !== null) {
            this.weapon.x = this.armFront.x;
            this.weapon.y = this.armFront.y + 15;
            this.weapon.rotation = this.armFront.rotation;
        }
    }

    destroy() {
        this.container.destroy();
    }
}