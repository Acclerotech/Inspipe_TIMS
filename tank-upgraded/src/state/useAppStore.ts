/**
 * useAppStore.ts — Lightweight global app state
 * Uses Zustand (Project B pattern). Replaces any scattered useState.
 */
import { create } from 'zustand';

interface AppState {
  selectedTankId: string;
  activeSite: string;
  riskFilter: string;
  setSelectedTankId: (id: string) => void;
  setActiveSite: (site: string) => void;
  setRiskFilter: (risk: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedTankId: '',
  activeSite: '',
  riskFilter: '',

  setSelectedTankId: (id) => set({ selectedTankId: id }),
  setActiveSite: (site) => set({ activeSite: site }),
  setRiskFilter: (risk) => set({ riskFilter: risk }),
}));
