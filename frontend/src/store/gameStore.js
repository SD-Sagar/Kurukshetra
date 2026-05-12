import { create } from 'zustand';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const useGameStore = create((set) => ({
    playerHealth: 100,
    playerFuel: 100,
    ammo: { loaded: 0, reserve: 0 },
    zoomLevel: 1,
    isMobile: false,
    isGuest: false,
    grenades: 3,
    
    // Character Customization
    appearance: {
        head: 'Commando',
        torso: 'Commando',
        legs: 'Commando',
        arms: 'commando'
    },
    
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
    showHUD: false,
    setShowHUD: (val) => set({ showHUD: val }),
    
    setSelectedWeapons: async (weapons) => {
        set({ selectedWeapons: weapons });
        const { userToken } = useGameStore.getState();
        if (userToken) {
            try {
                await fetch(`${API_BASE}/api/score/armory`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': userToken },
                    body: JSON.stringify({ selectedWeapons: weapons })
                });
            } catch (e) { console.error("Sync error", e); }
        }
    },

    setAppearance: async (parts) => {
        set((state) => ({ appearance: { ...state.appearance, ...parts } }));
        const { userToken, appearance } = useGameStore.getState();
        if (userToken) {
            try {
                await fetch(`${API_BASE}/api/score/armory`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': userToken },
                    body: JSON.stringify({ appearance })
                });
            } catch (e) { console.error("Sync error", e); }
        }
    },
    
    login: (token, profile) => {
        const defaultAppearance = { head: 'Commando', torso: 'Commando', legs: 'Commando', arms: 'commando' };
        const defaultWeapons = ['pistol', null];
        
        // Ensure profile data is valid and has expected structure
        const appearance = (profile?.appearance && profile.appearance.head) ? profile.appearance : defaultAppearance;
        const weapons = (profile?.selectedWeapons && Array.isArray(profile.selectedWeapons) && profile.selectedWeapons.length > 0) ? profile.selectedWeapons : defaultWeapons;

        set({ 
            userToken: token, 
            userProfile: profile, 
            isGuest: !token,
            appearance: appearance,
            selectedWeapons: weapons
        });
    },
    
    logout: () => set({ 
        userToken: null, 
        userProfile: null, 
        isGuest: false,
        appearance: { head: 'Commando', torso: 'Commando', legs: 'Commando', arms: 'commando' },
        selectedWeapons: ['pistol', null]
    }),
}));
