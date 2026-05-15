import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useGameStore } from './store/gameStore';

// Placeholder Imports
import Login from './components/Login';
import Armory from './components/Armory';
import GameOverlay from './components/GameOverlay';

// Session Guard Component
function SessionGuard({ children }) {
    const userProfile = useGameStore((state) => state.userProfile);
    const userToken = useGameStore((state) => state.userToken);
    const isGuest = useGameStore((state) => state.isGuest);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // If we are on a protected route and have no session (e.g. after refresh)
        if (location.pathname !== '/login' && location.pathname !== '/') {
            if (!userToken && !userProfile && !isGuest) {
                console.log("Session lost. Redirecting to Login...");
                navigate('/login', { replace: true });
            }
        }
    }, [userToken, userProfile, isGuest, location.pathname, navigate]);

    return children;
}

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
      <SessionGuard>
        <div className="w-full h-screen bg-gray-900 text-white overflow-hidden relative">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/armory" element={<Armory />} />
            <Route path="/play" element={<GameOverlay />} />
          </Routes>
        </div>
      </SessionGuard>
    </Router>
  );
}

export default App;
