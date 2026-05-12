import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import initGame from '../game/GameConfig';

export default function GameOverlay() {
  const gameRef = useRef(null);
  const { playerHealth, playerFuel, ammo, zoomLevel, grenades, isMobile, showHUD } = useGameStore();

  useEffect(() => {
    // Initialize Phaser game only once
    if (!gameRef.current) {
      gameRef.current = initGame('game-container');
    }
    
    return () => {
      // Cleanup game on unmount
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      {/* Phaser Canvas Container */}
      <div id="game-container" className="absolute top-0 left-0 w-full h-full z-0" />

      {/* React UI Overlay Layer */}
      {showHUD && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 p-4 flex flex-col justify-between">
          
          {/* Top HUD */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2 w-48">
              {/* Health Bar */}
              <div className="w-full bg-gray-800 h-6 border-2 border-gray-600 rounded">
                <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${playerHealth}%` }} />
              </div>
              {/* Fuel Bar */}
              <div className="w-full bg-gray-800 h-4 border-2 border-gray-600 rounded">
                <div className="bg-sagar-blue h-full transition-all duration-100" style={{ width: `${playerFuel}%` }} />
              </div>
            </div>
            
            {/* Zoom Info & Ammo */}
            <div className="flex flex-col items-end">
              <div className="text-white font-mono bg-gray-800 bg-opacity-70 px-2 py-1 rounded mb-2">
                ZOOM: {zoomLevel}x
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-white bg-gray-800 bg-opacity-70 px-2 py-1 rounded">
                  <span className="text-xl">💣</span>
                  <span className="font-bold">{grenades}</span>
                </div>
                <div className="text-white font-bold text-2xl drop-shadow-md">
                  {ammo.loaded} / <span className="text-gray-400 text-lg">{ammo.reserve}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Controls (Rendered conditionally) */}
          {isMobile && (
            <div className="flex justify-between items-end pb-8 pointer-events-auto">
              {/* Left Joystick Area */}
              <div className="w-32 h-32 bg-gray-700 bg-opacity-30 rounded-full border border-gray-500 flex items-center justify-center">
                <div className="text-gray-400 text-xs">MOVE/FLY</div>
              </div>
              
              {/* Right Action Buttons Area */}
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-gray-800 bg-opacity-50 rounded-full border border-gray-500 flex items-center justify-center active:bg-sagar-blue">
                   <span>💣</span>
                </div>
                <div className="w-32 h-32 bg-gray-700 bg-opacity-30 rounded-full border border-gray-500 flex items-center justify-center">
                  <div className="text-gray-400 text-xs">AIM/SHOOT</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
