import { create } from 'zustand';

export const useGameStore = create((set) => ({
    playerHealth: 100,
    playerFuel: 100,
    ammo: { loaded: 0, reserve: 0 },
    zoomLevel: 1,
    isMobile: false,
    userToken: null,
    userProfile: null,
    isGuest: false,
    grenades: 3,
    
    // Flow State
    isNewGame: false,
    selectedWeapons: ['pistol', null], // Default starting loadout
    
    setPlayerHealth: (health) => set({ playerHealth: health }),
    setPlayerFuel: (fuel) => set({ playerFuel: fuel }),
    setAmmo: (loaded, reserve) => set({ ammo: { loaded, reserve } }),
    setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
    setIsMobile: (isMobile) => set({ isMobile }),
    setGrenades: (count) => set({ grenades: count }),
    
    setIsNewGame: (val) => set({ isNewGame: val }),
    setSelectedWeapons: (weapons) => set({ selectedWeapons: weapons }),
    
    login: (token, profile) => set({ userToken: token, userProfile: profile, isGuest: !token }),
    logout: () => set({ userToken: null, userProfile: null, isGuest: false }),
}));
