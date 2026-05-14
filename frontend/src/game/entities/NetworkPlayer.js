import CharacterAssembler from '../utils/CharacterAssembler';

export default class NetworkPlayer {
    constructor(scene, id, name, avatar) {
        this.scene = scene;
        this.id = id;
        this.name = name;
        this.avatar = avatar;
        this.isOnline = true;
        this.lastFireTime = 0;
        this.fireRate = 150; // ms

        // Visuals
        this.assembler = new CharacterAssembler(scene, { type: 'player', appearance: avatar });
        this.container = this.assembler.container;

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

    updateTransform(data) {
        if (!this.isOnline) return;

        const { x, y, flipX, aimAngle, currentAnim, weapon } = data;
        
        this.container.setPosition(x, y + 10);
        this.hitbox.setPosition(x, y + 10);
        this.hitbox.body.reset(x, y + 10); // FORCE physics body update
        
        this.assembler.aimAt(x + Math.cos(aimAngle) * 100, y + Math.sin(aimAngle) * 100);
        
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
