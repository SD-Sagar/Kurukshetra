import Phaser from 'phaser';
import Preloader from './scenes/Preloader';
import MainMenu from './scenes/MainMenu';
import Armory from './scenes/Armory';
import Scene1_Breach from './scenes/Scene1_Breach';
import Scene2_Recruitment from './scenes/Scene2_Recruitment';
import MainGame from './scenes/MainGame';
import PvPLobby from './pvp/PvPLobby';
import PvPArmory from './pvp/PvPArmory';
import PvPGame from './pvp/PvPGame';

export default function initGame(containerId) {
    const config = {
        type: Phaser.WEBGL,
        parent: containerId,
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: '100%',
            height: '100%',
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 600 },
                debug: false,
                tileBias: 40,
                fps: 120
            }
        },
        scene: [
            Preloader,
            MainMenu,
            Armory,
            Scene1_Breach,
            Scene2_Recruitment,
            MainGame,
            PvPLobby,
            PvPArmory,
            PvPGame
        ],
        backgroundColor: '#111827'
    };

    return new Phaser.Game(config);
}
