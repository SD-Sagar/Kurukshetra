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

        // Character Assets - Player
        this.load.image('player_head', 'assets/characters/player/head/head-male.png');
        this.load.image('player_head_focus', 'assets/characters/player/head/headFocus-male.png');
        this.load.image('player_head_shock', 'assets/characters/player/head/headShock-male.png');
        this.load.image('player_torso', 'assets/characters/player/torso/body-male.png');
        this.load.image('player_arm', 'assets/characters/player/arms/arm-male.png');
        this.load.image('player_hand', 'assets/characters/player/arms/hand-male.png');
        this.load.image('player_leg', 'assets/characters/player/legs/leg-male.png');
        this.load.image('player_leg_bend', 'assets/characters/player/legs/legBend-male.png');

        // Character Assets - Sarge
        this.load.image('sarge_head', 'assets/characters/sarge/head/head.png');
        this.load.image('sarge_head_focus', 'assets/characters/sarge/head/headFocus.png');
        this.load.image('sarge_head_shock', 'assets/characters/sarge/head/headShock.png');
        this.load.image('sarge_torso', 'assets/characters/sarge/torso/body.png');
        this.load.image('sarge_arm', 'assets/characters/sarge/arms/arm.png');
        this.load.image('sarge_hand', 'assets/characters/sarge/arms/hand.png');
        this.load.image('sarge_leg', 'assets/characters/sarge/legs/leg.png');
        this.load.image('sarge_leg_bend', 'assets/characters/sarge/legs/legBend.png');

        // Character Assets - Enemies
        this.load.image('enemy_head', 'assets/characters/Enimies/head/head.png');
        this.load.image('enemy_torso', 'assets/characters/Enimies/torso/body.png');
        this.load.image('enemy_arm', 'assets/characters/Enimies/arms/arm.png');
        this.load.image('enemy_hand', 'assets/characters/Enimies/arms/hand.png');
        this.load.image('enemy_leg', 'assets/characters/Enimies/legs/leg.png');
        this.load.image('enemy_leg_bend', 'assets/characters/Enimies/legs/legBend.png');

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

        // Map Assets
        this.load.tilemapTiledJSON('map', 'assets/maps/map.json');
        this.load.image('tileset_background', 'assets/maps/background.png');
        this.load.image('tileset_70', 'assets/maps/tileset_70.png');

        this.load.on('loaderror', (fileObj) => {
            console.error(`Failed to load asset: ${fileObj.key} from ${fileObj.url}`);
        });
    }

    create() {
        // Automatically start the Main Menu
        this.scene.start('MainMenu');
    }
}
