import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export default function Armory() {
  const navigate = useNavigate();
  const userProfile = useGameStore((state) => state.userProfile);

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-sagar-blue tracking-widest uppercase">Armory</h1>
        <div className="text-gray-400">Callsign: <span className="text-white font-bold">{userProfile?.username || 'Guest'}</span></div>
      </div>

      <div className="flex-1 flex gap-8">
        {/* Avatar Setup */}
        <div className="flex-1 bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col items-center justify-center">
          <div className="w-32 h-32 bg-gray-700 rounded-full mb-4 flex items-center justify-center border-4 border-sagar-blue">
            <span className="text-4xl">🤖</span>
          </div>
          <h2 className="text-xl mb-2 font-bold">Combat Avatar</h2>
          <p className="text-gray-400 text-sm text-center mb-4">Cloudinary avatar integration coming soon.</p>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">Customize</button>
        </div>

        {/* Loadout Setup */}
        <div className="flex-[2] bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl mb-4 font-bold border-b border-gray-700 pb-2">Loadout</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h3 className="text-gray-400 text-sm mb-1">Primary Weapon</h3>
              <div className="text-lg font-bold text-sagar-blue">Plasma Rifle</div>
            </div>
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h3 className="text-gray-400 text-sm mb-1">Secondary Weapon</h3>
              <div className="text-lg font-bold">Standard Pistol</div>
            </div>
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h3 className="text-gray-400 text-sm mb-1">Equipment</h3>
              <div className="text-lg font-bold">Frag Grenade</div>
            </div>
            <div className="bg-gray-900 p-4 rounded border border-gray-700">
              <h3 className="text-gray-400 text-sm mb-1">Mobility</h3>
              <div className="text-lg font-bold">Standard Jetpack</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button 
          onClick={() => navigate('/play')}
          className="px-12 py-4 bg-sagar-blue hover:bg-blue-600 text-white font-bold rounded text-xl shadow-[0_0_15px_rgba(0,123,255,0.5)] transition-all uppercase tracking-wider"
        >
          Deploy
        </button>
      </div>
    </div>
  );
}
