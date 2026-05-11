import Phaser from 'phaser';

export default class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Render a loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x007BFF, 1); // Sagar Blue
            progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });



        // Character Assets - Sarge
        // Character Assets - Sarge
        this.load.image('head-sarge', 'assets/characters/sarge/head/head.png');
        this.load.image('headFocus-sarge', 'assets/characters/sarge/head/headFocus.png');
        this.load.image('headShock-sarge', 'assets/characters/sarge/head/headShock.png');
        this.load.image('body-sarge', 'assets/characters/sarge/torso/body.png');
        this.load.image('arm-sarge', 'assets/characters/sarge/arms/arm.png');
        this.load.image('leg-sarge', 'assets/characters/sarge/legs/leg.png');
        this.load.image('legBend-sarge', 'assets/characters/sarge/legs/legBend.png');

        // Character Assets - Enemies
        this.load.image('head-enemy', 'assets/characters/Enimies/head/head.png');
        this.load.image('body-enemy', 'assets/characters/Enimies/torso/body.png');
        this.load.image('arm-enemy', 'assets/characters/Enimies/arms/arm.png');
        this.load.image('leg-enemy', 'assets/characters/Enimies/legs/leg.png');
        this.load.image('legBend-enemy', 'assets/characters/Enimies/legs/legBend.png');

        // Weapon Sprites
        this.load.image('pistol', 'assets/weapons/pistol.png');
        this.load.image('smg', 'assets/weapons/smg.png');
        this.load.image('rifle', 'assets/weapons/rifle.png');
        this.load.image('sniper', 'assets/weapons/sniper.png');
        this.load.image('shotgun', 'assets/weapons/shotgun.png');
        this.load.image('launcher', 'assets/weapons/launcher.png');
        this.load.image('grenade', 'assets/weapons/grenade.png');
        this.load.image('rocket', 'assets/weapons/rocket.png');
        this.load.image('sarge_smg', 'assets/weapons/sarge_smg.png');
        this.load.image('dagger', 'assets/weapons/dagger.png');
        this.load.image('machinegun', 'assets/weapons/machinegun.png');
        this.load.image('tacticalshotgun', 'assets/weapons/tacticalshotgun.png');
        this.load.image('bullet', 'assets/weapons/bullet.png');

        // Map Assets
        this.load.tilemapTiledJSON('map', 'assets/maps/map.json');
        this.load.image('tileset_background', 'assets/maps/background.png');
        this.load.image('tileset_70', 'assets/maps/tileset_70.png');

        // --- NEW CUSTOMIZATION ASSETS ---
        
        // HEADS (Normal, Shock, Focus)
        const heads = ['Commando', 'Indiancaptain', 'Indiancommando', 'Indiancommando2', 'Ops', 'Soldire', 'Spetnaz', 'Spetnaz2', 'Terrorist'];
        heads.forEach(h => {
            this.load.image(`head-${h}`, `assets/characters/player/head/head-${h}.png`);
            this.load.image(`headFocus-${h}`, `assets/characters/player/head/headFocus-${h}.png`);
            // Note: headShock-Indiancapain.png has a typo in filename (capain), handling it:
            const shockFile = h === 'Indiancaptain' ? 'Indiancapain' : h;
            this.load.image(`headShock-${h}`, `assets/characters/player/head/headShock-${shockFile}.png`);
        });

        // TORSOS
        const torsos = ['Commando', 'Indiancommando', 'Indiancommando2', 'Ops', 'Soldire', 'Spetnaz2', 'Terrorist'];
        torsos.forEach(t => {
            this.load.image(`body-${t}`, `assets/characters/player/torso/body-${t}.png`);
        });

        // ARMS
        const arms = ['commando', 'navy', 'soldire', 'spetnaz'];
        arms.forEach(a => {
            this.load.image(`arm-${a}`, `assets/characters/player/arms/arm-${a}.png`);
        });

        // LEGS (Normal, Bend)
        const legs = ['Commando', 'Indiancommando', 'Ops', 'Soldire', 'Spetnaz', 'Spetnaz2', 'Terrorist'];
        legs.forEach(l => {
            this.load.image(`leg-${l}`, `assets/characters/player/legs/leg-${l}.png`);
            this.load.image(`legBend-${l}`, `assets/characters/player/legs/legBend-${l}.png`);
        });

        this.load.on('loaderror', (fileObj) => {
            console.error(`Failed to load asset: ${fileObj.key} from ${fileObj.url}`);
        });
    }

    create() {
        // Automatically start the Main Menu
        this.scene.start('MainMenu');
    }
}
