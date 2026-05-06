import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useGameStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (res.ok) {
        login(data.token, data.user);
        navigate('/play'); 
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Connection to server failed');
    }
  };

  const handleGuest = () => {
    login(null, null); // Null profile = Guest
    navigate('/play');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-gray-900 bg-opacity-95">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-blue-500 w-96 max-w-[90%]">
        <h1 className="text-3xl font-bold text-center mb-6 text-white tracking-widest">
          SD-COMBAT
        </h1>
        <h2 className="text-center text-blue-400 mb-8 text-sm tracking-widest font-mono">
          DEY-SYNC PROTOCOL
        </h2>

        {error && <p className="text-red-500 text-center mb-4 text-xs font-bold">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Callsign (Username)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="p-3 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Passcode"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="mt-4 p-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-colors"
          >
            {isLogin ? 'INITIATE SYNC' : 'REGISTER RECRUIT'}
          </button>
        </form>

        <div className="relative flex py-5 items-center">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs">OR</span>
            <div className="flex-grow border-t border-gray-600"></div>
        </div>

        <button
          onClick={handleGuest}
          className="w-full p-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded transition-colors border border-gray-500"
        >
          PLAY AS GUEST
        </button>

        <p className="mt-6 text-center text-gray-400 text-sm">
          {isLogin ? "New recruit?" : "Already enlisted?"}{" "}
          <span
            className="text-blue-400 cursor-pointer hover:underline font-bold"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Register here" : "Login here"}
          </span>
        </p>

        <div className="mt-8 text-center text-xs text-gray-500 font-mono">
          SECURE PROTOCOL v1.0.4
        </div>
      </div>
    </div>
  );
}
