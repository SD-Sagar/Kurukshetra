import { create } from 'zustand';

export const usePvPStore = create((set) => ({
    roomCode: null,
    isHost: false,
    players: [], // Array of { id, name, appearance, isReady }
    matchTime: 0,
    isMatchStarted: false,
    leaderboard: [],
    lootManifest: [],
    
    setRoomCode: (code) => set({ roomCode: code }),
    setIsHost: (val) => set({ isHost: val }),
    setPlayers: (list) => set({ players: list }),
    setMatchTime: (time) => set({ matchTime: time }),
    setIsMatchStarted: (val) => set({ isMatchStarted: val }),
    setLeaderboard: (data) => set({ leaderboard: data }),
    setLootManifest: (data) => set({ lootManifest: data }),

    resetPvP: () => set({
        roomCode: null,
        isHost: false,
        players: [],
        matchTime: 0,
        isMatchStarted: false,
        leaderboard: [],
        lootManifest: []
    })
}));
