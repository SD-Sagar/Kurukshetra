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
        this.weapon.setOrigin(0.85, 0.5); // Grip by the Handle (Right side of PNG)
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
            this.grenadeBelt,
            this.head,
            this.armFront,
            this.weapon
        ]);

        this.walkCycle = 0;
        this.currentWeaponColor = null;
    }

    update(time, delta, velocityX, isCrouching = false, weaponColor = null) {
        const prefix = this.type === 'player' ? 'player' : (this.type === 'sarge' ? 'sarge' : 'enemy');
        this.currentWeaponColor = weaponColor;

        if (weaponColor !== null) {
            this.weapon.setVisible(true);
            if (typeof weaponColor === 'string') {
                 this.weapon.setTexture(weaponColor);
            }
        } else {
            this.weapon.setVisible(false);
        }

        if (isCrouching) {
            this.legFront.setTexture(`${prefix}_leg_bend`);
            this.legBack.setTexture(`${prefix}_leg_bend`);
            this.torso.y = 12;
            this.head.y = -23;
            this.armFront.y = 7;
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
        if (targetX === undefined || targetY === undefined) return;

        // 1. Flip Deadzone / Buffer (Prevents flickering at center)
        const deadzone = 15;
        const isFacingLeft = this.container.scaleX < 0;
        
        if (isFacingLeft && targetX > this.container.x + deadzone) {
            this.container.setScale(this.baseScale, this.baseScale);
        } else if (!isFacingLeft && targetX < this.container.x - deadzone) {
            this.container.setScale(-this.baseScale, this.baseScale);
        }

        // 2. Continuous Angle Calculation
        const angle = Phaser.Math.Angle.Between(this.container.x, this.container.y, targetX, targetY);
        const flipFactor = this.container.scaleX < 0 ? -1 : 1;
        
        // Adjust arm rotation based on flip
        if (this.container.scaleX < 0) {
            const flippedRotation = -angle + Math.PI;
            this.armFront.rotation = flippedRotation - Math.PI/2;
            this.armBack.rotation = flippedRotation - Math.PI/2;
        } else {
            this.armFront.rotation = angle - Math.PI/2;
            this.armBack.rotation = angle - Math.PI/2;
        }

        // 3. Locked-Grip: Position weapon at the Hand (End of Arm)
        if (this.currentWeaponColor !== null) {
            // Precise hand offset (The hand is at the bottom of the arm sprite)
            const armVisualLength = 42 * this.baseScale; 
            
            // The arm points "Down" at 0 rotation, so we add PI/2 to get the pointing vector
            const armAngle = this.armFront.rotation + Math.PI/2;
            
            this.weapon.x = this.armFront.x + Math.cos(armAngle) * armVisualLength;
            this.weapon.y = this.armFront.y + Math.sin(armAngle) * armVisualLength;
            
            // Align gun barrel with the arm direction
            // Subtracting PI/2 because handle is on the Right (0.85) and barrel is on the Left
            this.weapon.rotation = this.armFront.rotation - Math.PI/2;
            
            // Universal 'Right-Side Up' Fix:
            // Since the PNG points Left, rotating it 180 to face forward makes it upside down.
            // We set scaleY to -1 to flip it back to being right-side up.
            this.weapon.setScale(1, -1);
        }
    }

    getMuzzlePosition() {
        if (!this.weapon.visible) return { x: this.container.x, y: this.container.y };
        
        // Muzzle is at the opposite end of the pivot (0.85)
        const muzzleDist = 45 * this.baseScale;
        const flip = this.container.scaleX < 0 ? -1 : 1;
        
        // Shoot angle follows the weapon rotation
        const shootAngle = this.weapon.rotation + (flip < 0 ? Math.PI : 0);
        
        return {
            x: this.container.x + (this.weapon.x * flip) + Math.cos(shootAngle) * muzzleDist,
            y: this.container.y + this.weapon.y + Math.sin(shootAngle) * muzzleDist
        };
    }

    destroy() {
        this.container.destroy();
    }
}