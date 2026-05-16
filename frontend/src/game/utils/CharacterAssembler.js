import Phaser from 'phaser';
import { useGameStore } from '../../store/gameStore';

export default class CharacterAssembler {
    constructor(scene, config) {
        this.scene = scene;
        this.config = config;
        this.type = config.type;

        this.container = this.scene.add.container(0, 0);
        this.baseScale = 0.5;
        this.container.setScale(this.baseScale);

        const prefix = this.type === 'player' ? 'player' : (this.type === 'sarge' ? 'sarge' : 'enemy');

        // Dynamic Appearance Mapping
        const store = useGameStore.getState();
        const app = config.appearance || (this.type === 'player' ? store.appearance : {
            head: prefix, torso: prefix, arms: prefix, legs: prefix
        });
        this.appearance = app; // Store it for refresh

        // Configuration based on type
        const isGoldenRatio = this.type === 'player' || this.type === 'sarge';
        
        // Define standard offsets
        this.offsets = {
            headY: isGoldenRatio ? -10 : -35,
            armY: this.type === 'sarge' ? -28 : (this.type === 'player' ? -23 : -5), // Sarge needs a specific lift for his assets
            armFX: isGoldenRatio ? -23 : 15,
            armBX: isGoldenRatio ? 8 : -15,
            legY: isGoldenRatio ? 28 : 20
        };

        const headY = this.offsets.headY;
        const armY = this.offsets.armY;
        const armFX = this.offsets.armFX;
        const armBX = this.offsets.armBX;
        const legY = this.offsets.legY;
        
        const legScale = isGoldenRatio ? 1.3 : 1.0;
        this.armScale = isGoldenRatio ? 1.2 : 1.0;
        const armScale = this.armScale;

        this.legBack = this.scene.add.sprite(-8, legY, `leg-${app.legs}`);
        this.legFront = this.scene.add.sprite(8, legY, `leg-${app.legs}`);
        this.legBack.setScale(legScale);
        this.legFront.setScale(legScale);

        this.torso = this.scene.add.sprite(0, 0, `body-${app.torso}`);
        this.armBack = this.scene.add.sprite(armBX, armY, `arm-${app.arms}`);
        this.armFront = this.scene.add.sprite(armFX, armY, `arm-${app.arms}`);
        this.armBack.setScale(armScale);
        this.armFront.setScale(armScale);

        this.weapon = this.scene.add.sprite(0, 0, 'pistol');
        this.weapon.setOrigin(0.85, 0.5); 
        this.weapon.setVisible(false);
        this.head = this.scene.add.sprite(0, headY, `head-${app.head}`);

        // Grenade Belt (Visual Only)
        this.grenadeBelt = this.scene.add.sprite(0, 15, 'grenade');
        this.grenadeBelt.setDisplaySize(33, 33); // Increased by 50% (22 -> 33)
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
        this.meleeOffset = 0;
        
        // Slash Visual
        this.slashGraphics = this.scene.add.graphics();
        this.container.add(this.slashGraphics);
    }

    setExpression(type) {
        const app = this.appearance;
        
        if (type === 'shock') {
            this.head.setTexture(`headShock-${app.head}`);
        } else if (type === 'focus') {
            this.head.setTexture(`headFocus-${app.head}`);
        } else {
            this.head.setTexture(`head-${app.head}`);
        }
    }

    update(time, delta, velocityX, isCrouching = false, weaponColor = null, grenades = 0) {
        const app = this.appearance;
        
        this.currentWeaponColor = weaponColor;
        
        // Hide belt if no grenades left (Player Only)
        if (this.type === 'player') {
            this.grenadeBelt.setVisible(grenades > 0);
        }

        // Show weapon if key exists
        if (weaponColor && weaponColor !== null) {
            this.weapon.setVisible(true);
            this.weapon.setTexture(weaponColor);
        } else {
            this.weapon.setVisible(false);
        }

        const isGoldenRatio = this.type === 'player' || this.type === 'sarge';

        if (isCrouching) {
            this.legFront.setTexture(`legBend-${app.legs}`);
            this.legBack.setTexture(`legBend-${app.legs}`);
            this.torso.y = 12;
            this.head.y = this.offsets.headY + 13;
            this.armFront.y = this.offsets.armY + 12;
            this.armBack.y = this.offsets.armY + 12;
            this.grenadeBelt.y = 27; 
        } else {
            this.legFront.setTexture(`leg-${app.legs}`);
            this.legBack.setTexture(`leg-${app.legs}`);
            this.torso.y = 0;
            this.head.y = this.offsets.headY;
            this.armFront.y = this.offsets.armY;
            this.armBack.y = this.offsets.armY;
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
                    this.legFront.setTexture(`legBend-${app.legs}`);
                    this.legBack.setTexture(`leg-${app.legs}`);
                } else {
                    this.legFront.setTexture(`leg-${app.legs}`);
                    this.legBack.setTexture(`legBend-${app.legs}`);
                }
            } else {
                this.legFront.setAngle(0);
                this.legBack.setAngle(0);
                this.legFront.setTexture(`leg-${app.legs}`);
                this.legBack.setTexture(`leg-${app.legs}`);
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
            this.armFront.rotation = flippedRotation - Math.PI / 2;
            this.armBack.rotation = flippedRotation - Math.PI / 2;
        } else {
            this.armFront.rotation = angle - Math.PI / 2;
            this.armBack.rotation = angle - Math.PI / 2;
        }

        // 3. Locked-Grip: Position weapon at the Hand (End of Arm)
        if (this.currentWeaponColor !== null) {
            // Precise hand offset (The hand is at the bottom of the arm sprite)
            const armVisualLength = 42 * this.baseScale * this.armScale;

            // The arm points "Down" at 0 rotation, so we add PI/2 to get the pointing vector
            const armAngle = this.armFront.rotation + Math.PI / 2;

            // Apply melee offset (lunge)
            const weaponDist = armVisualLength + this.meleeOffset;

            this.weapon.x = this.armFront.x + Math.cos(armAngle) * weaponDist;
            this.weapon.y = this.armFront.y + Math.sin(armAngle) * weaponDist;

            // Align gun barrel with the arm direction
            // Subtracting PI/2 because handle is on the Right (0.85) and barrel is on the Left
            this.weapon.rotation = this.armFront.rotation - Math.PI / 2;

            // Universal 'Right-Side Up' Fix:
            // Since the PNG points Left, rotating it 180 to face forward makes it upside down.
            // We set scaleY to -1 to flip it back to being right-side up.
            // Increased scale for 'Impressive' look
            this.weapon.setScale(1.25, -1.25);
        }
    }

    getMuzzlePosition() {
        if (!this.weapon.visible) return { x: this.container.x, y: this.container.y };
        
        const flip = this.container.scaleX < 0 ? -1 : 1;
        
        // 1. Calculate Hand World Position (Pivot Point)
        const handX = this.container.x + (this.weapon.x * this.baseScale * flip);
        const handY = this.container.y + (this.weapon.y * this.baseScale);

        // 2. Calculate World Angle of the Barrel
        // The PNG points LEFT, so 0 rotation is Left. We adjust based on flip.
        const worldRotation = this.weapon.rotation + (flip < 0 ? 0 : Math.PI);
        
        // 3. Project Muzzle Tip (Gun tip is about 55px from handle)
        const isGoldenRatio = this.type === 'player' || this.type === 'sarge';
        const muzzleDist = 55 * this.baseScale;
        
        // Per-Weapon Barrel Alignment (Only for Sarge/Player)
        let barrelRise = 0;
        if (isGoldenRatio) {
            const weaponKey = this.currentWeaponColor; // e.g. 'pistol', 'rifle'
            const weaponOffsets = {
                'pistol': -12,
                'smg': -14,
                'rifle': -16,
                'machinegun': -16,
                'shotgun': -12,
                'tacticalshotgun': -12,
                'sniper': -4, // Perfect as is
                'launcher': -14,
                'sarge_smg': -14
            };
            
            const offset = weaponOffsets[weaponKey] || -8; // Default fallback
            barrelRise = offset * this.baseScale * flip;
        }
        
        // Perpendicular angle for barrel rise
        const perpRotation = worldRotation + Math.PI / 2;
        
        const spawnX = handX + Math.cos(worldRotation) * muzzleDist + Math.cos(perpRotation) * barrelRise;
        const spawnY = handY + Math.sin(worldRotation) * muzzleDist + Math.sin(perpRotation) * barrelRise;

        return { x: spawnX, y: spawnY };
    }

    playMeleeAnimation() {
        if (this.meleeTween) this.meleeTween.stop();

        // 1. Physical Lunge (Tween the offset)
        this.meleeTween = this.scene.tweens.add({
            targets: this,
            meleeOffset: 35,
            duration: 80,
            yoyo: true,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.meleeTween = null;
                this.meleeOffset = 0;
            }
        });

        // 2. Visual Slash Arc
        this.drawSlash();
    }

    drawSlash() {
        this.slashGraphics.clear();
        this.slashGraphics.lineStyle(4, 0xffffff, 0.8);
        
        // Draw an arc in front of the hand
        const armAngle = this.armFront.rotation + Math.PI/2;
        const startAngle = Phaser.Math.RadToDeg(armAngle - 0.8);
        const endAngle = Phaser.Math.RadToDeg(armAngle + 0.8);
        
        this.slashGraphics.beginPath();
        this.slashGraphics.arc(this.weapon.x, this.weapon.y, 40, Phaser.Math.DegToRad(startAngle), Phaser.Math.DegToRad(endAngle), false);
        this.slashGraphics.strokePath();

        this.scene.tweens.add({
            targets: this.slashGraphics,
            alpha: 0,
            duration: 150,
            onComplete: () => {
                this.slashGraphics.clear();
                this.slashGraphics.alpha = 1;
            }
        });
    }

    explode() {
        const pieces = [
            { s: this.head, name: 'head' },
            { s: this.torso, name: 'torso' },
            { s: this.armFront, name: 'armF' },
            { s: this.armBack, name: 'armB' },
            { s: this.legFront, name: 'legF' },
            { s: this.legBack, name: 'legB' }
        ];
        
        pieces.forEach(p => {
            if (!p.s || !p.s.visible) return;
            
            // Get World Position
            const worldPos = new Phaser.Math.Vector2();
            p.s.getWorldTransformMatrix().transformPoint(0, 0, worldPos);
            
            // Create a temporary DEBRIS sprite (Clone)
            const debris = this.scene.add.sprite(worldPos.x, worldPos.y, p.s.texture.key);
            debris.setScale(p.s.scaleX * this.container.scaleX, p.s.scaleY * this.container.scaleY);
            debris.setRotation(p.s.rotation + this.container.rotation);
            debris.setDepth(10);

            // Apply Physics to Debris
            this.scene.physics.add.existing(debris);
            debris.body.setVelocity(
                Phaser.Math.Between(-300, 300),
                Phaser.Math.Between(-400, -200)
            );
            debris.body.setAngularVelocity(Phaser.Math.Between(-400, 400));
            debris.body.setGravityY(1000);
            debris.body.setBounce(0.3);
            
            // Add collision with world/platforms
            if (this.scene.platforms) {
                this.scene.physics.add.collider(debris, [this.scene.platforms, this.scene.physicsDetails]);
            }
            
            // Fade and cleanup
            this.scene.tweens.add({
                targets: debris,
                alpha: 0,
                duration: 1500,
                delay: 1000,
                onComplete: () => debris.destroy()
            });
        });
        
        this.container.setVisible(false);
    }

    reset() {
        this.container.setVisible(true);
        this.refreshTextures();
    }

    refreshTextures(newApp = null) {
        if (!this.head || !this.head.scene) return; // Safety check
        
        if (newApp) this.appearance = newApp;
        const app = this.appearance;

        this.legBack.setTexture(`leg-${app.legs}`);
        this.legFront.setTexture(`leg-${app.legs}`);
        this.torso.setTexture(`body-${app.torso}`);
        this.armBack.setTexture(`arm-${app.arms}`);
        this.armFront.setTexture(`arm-${app.arms}`);
        this.head.setTexture(`head-${app.head}`);
    }

    destroy() {
        if (this.meleeTween) this.meleeTween.stop();
        if (this.slashGraphics) this.slashGraphics.destroy();
        this.container.destroy();
    }
}