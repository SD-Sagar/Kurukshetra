import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useGameStore } from './store/gameStore';

// Placeholder Imports
import Login from './components/Login';
import Armory from './components/Armory';
import GameOverlay from './components/GameOverlay';

function App() {
  const setIsMobile = useGameStore((state) => state.setIsMobile);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
      setIsMobile(isMobileDevice);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  return (
    <Router>
      <div className="w-full h-screen bg-gray-900 text-white overflow-hidden relative">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/armory" element={<Armory />} />
          <Route path="/play" element={<GameOverlay />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
