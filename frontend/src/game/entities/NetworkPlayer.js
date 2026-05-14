import CharacterAssembler from '../utils/CharacterAssembler';

export default class NetworkPlayer {
    constructor(scene, id, name, avatar, x, y) {
        this.scene = scene;
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.isOnline = true;
        
        // Interpolation
        this.targetX = x || 0;
        this.targetY = y || 0;
        this.lerpSpeed = 0.35; 
        this.isJetpacking = false;
        this.isJumping = false;
        this.lastFireTime = 0;
        this.fireRate = 150;

        // Jetpack Particles
        this.jetpackParticles = scene.add.particles(0, 0, 'bullet_player', {
            speed: { min: 50, max: 150 },
            angle: { min: 80, max: 100 },
            scale: { start: 1.5, end: 0 },
            lifespan: 400,
            gravityY: 400,
            frequency: -1,
            tint: 0xffaa44,
            blendMode: 'ADD'
        });
        this.jetpackParticles.setDepth(5);

        // Visuals
        this.assembler = new CharacterAssembler(scene, { type: 'player', appearance: avatar });
        this.container = this.assembler.container;
        this.container.setPosition(this.targetX, this.targetY);

        // Physics Body (Invisible)
        this.hitbox = scene.physics.add.sprite(this.container.x, this.container.y, 'white_square');
        this.hitbox.setVisible(false);
        this.hitbox.body.setSize(50, 90);
        this.hitbox.body.setAllowGravity(false);
        this.hitbox.body.setImmovable(true);
        this.hitbox.owner = this;

        // Name Tag
        this.nameTag = scene.add.text(0, -60, name, {
            font: 'bold 14px monospace',
            fill: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);
        this.container.add(this.nameTag);

        // Dummy indicator
        this.dummyText = scene.add.text(0, -80, 'OFFLINE', {
            font: 'bold 10px monospace',
            fill: '#ef4444'
        }).setOrigin(0.5).setVisible(false);
        this.container.add(this.dummyText);
    }

    update(time, delta) {
        if (!this.isOnline) return;

        // Smooth Interpolation (runs at 60fps)
        this.container.x += (this.targetX - this.container.x) * this.lerpSpeed;
        this.container.y += ((this.targetY + 10) - this.container.y) * this.lerpSpeed;

        // Sync hitbox to visual
        if (this.hitbox && this.hitbox.body) {
            this.hitbox.body.reset(this.container.x, this.container.y);
        }

        // Action Visuals
        if (this.isJetpacking) {
            this.jetpackParticles.emitParticleAt(this.container.x, this.container.y + 55);
        }
    }

    updateTransform(data) {
        if (!this.isOnline) return;

        this.targetX = data.x;
        this.targetY = data.y;
        
        const { aimAngle, currentAnim, weapon, isJetpacking, isJumping } = data;
        this.isJetpacking = isJetpacking;
        this.isJumping = isJumping;
        
        this.assembler.aimAt(this.container.x + Math.cos(aimAngle) * 100, this.container.y + Math.sin(aimAngle) * 100);
        
        // Calculate velocity for animation
        const vx = Math.cos(aimAngle) * (currentAnim === 'walk' ? 100 : 0);
        
        // Use the saved avatar for updates too
        this.assembler.update(this.scene.time.now, 16, vx, false, weapon, 0, this.avatar);

        // Update local state
        this.currentAnim = currentAnim;
    }

    spawnVisualBullet(angle, weapon) {
        const muzzle = this.assembler.getMuzzlePosition();
        const texture = weapon === 'dagger' ? 'white_square' : 'bullet_player';
        
        const bullet = this.scene.physics.add.sprite(muzzle.x, muzzle.y, texture);
        if (this.scene.remoteBullets) this.scene.remoteBullets.add(bullet);
        bullet.setActive(true).setVisible(true);
        bullet.setTint(0xffffff);

        const useBulletPng = ['pistol', 'rifle', 'smg', 'machinegun', 'sarge_smg'].includes(weapon);
        if (useBulletPng) {
            bullet.setTexture('bullet');
            bullet.setRotation(angle + Math.PI);
            bullet.setDisplaySize(20, 10);
        } else if (weapon === 'launcher' || weapon === 'rocket') {
            bullet.setTexture('rocket');
            bullet.setDisplaySize(45, 22);
            bullet.setRotation(angle);
        } else {
            bullet.setRotation(angle);
        }

        bullet.body.reset(muzzle.x, muzzle.y);
        bullet.body.setAllowGravity(false);
        
        const speed = (weapon === 'launcher' || weapon === 'rocket') ? 800 : 1200;
        bullet.body.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );

        // Visual only collision with walls
        this.scene.physics.add.collider(bullet, [this.scene.platforms, this.scene.physicsDetails], () => {
            bullet.destroy();
        });
        
        // Auto-cleanup
        this.scene.time.delayedCall(1500, () => {
            if (bullet.active) bullet.destroy();
        });
    }

    setOffline() {
        this.isOnline = false;
        this.dummyText.setVisible(true);
        this.nameTag.setAlpha(0.5);
        this.container.setAlpha(0.7);
    }

    destroy() {
        this.container.destroy();
        this.hitbox.destroy();
    }
}
