import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { INTERACTIVE_TOUR_STEPS, FACULTY_TOUR_STEPS, type InteractiveStep } from '../constants/onboardingTour';

export interface TargetMeasurement {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
}

const STORAGE_PREFIX = 'faculty_tour_completed_';

export function getTourStorageKey(userId: string | number): string {
  return `${STORAGE_PREFIX}${userId}`;
}

interface OnboardingState {
  showWelcomeIntro: boolean;
  isActive: boolean;
  isMinimized: boolean;
  currentStepIndex: number;
  isDemoSessionActive: boolean;
  showFeatureGuidesSheet: boolean;
  isCreateModalOpen: boolean;
  hasTestedLiveDemo: boolean;
  targets: Record<string, TargetMeasurement>;

  registerTarget: (key: string, measurement: TargetMeasurement) => void;
  unregisterTarget: (key: string) => void;
  showWelcome: () => void;
  closeWelcome: () => void;
  startTour: (stepIndex?: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  goToStepId: (stepId: string) => void;
  advanceActionStep: (expectedStepId: string) => void;
  toggleMinimized: () => void;
  setMinimized: (minimized: boolean) => void;
  setCreateModalOpen: (open: boolean) => void;
  setTestedLiveDemo: (tested: boolean) => void;
  openDemoSession: () => void;
  closeDemoSession: () => void;
  openFeatureGuides: () => void;
  closeFeatureGuides: () => void;
  skipTour: (userId?: string | number) => Promise<void>;
  finishTour: (userId?: string | number) => Promise<void>;
  resetTour: (userId?: string | number) => Promise<void>;
  checkShouldShow: (userId: string | number, isFaculty: boolean) => Promise<boolean>;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  showWelcomeIntro: false,
  isActive: false,
  isMinimized: false,
  currentStepIndex: 0,
  isDemoSessionActive: false,
  showFeatureGuidesSheet: false,
  isCreateModalOpen: false,
  hasTestedLiveDemo: false,
  targets: {},

  registerTarget: (key, measurement) => {
    set((state) => ({
      targets: {
        ...state.targets,
        [key]: measurement,
      },
    }));
  },

  unregisterTarget: (key) => {
    set((state) => {
      const next = { ...state.targets };
      delete next[key];
      return { targets: next };
    });
  },

  showWelcome: () => {
    set({ showWelcomeIntro: true, isActive: false });
  },

  closeWelcome: () => {
    set({ showWelcomeIntro: false });
  },

  startTour: (stepIndex = 0) => {
    const validIndex = stepIndex >= 0 && stepIndex < INTERACTIVE_TOUR_STEPS.length ? stepIndex : 0;
    set({
      showWelcomeIntro: false,
      isActive: true,
      isMinimized: false,
      currentStepIndex: validIndex,
      hasTestedLiveDemo: false,
    });
  },

  nextStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex < INTERACTIVE_TOUR_STEPS.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  goToStep: (index: number) => {
    if (index >= 0 && index < INTERACTIVE_TOUR_STEPS.length) {
      set({ currentStepIndex: index, isActive: true, showWelcomeIntro: false });
    }
  },

  goToStepId: (stepId: string) => {
    const idx = INTERACTIVE_TOUR_STEPS.findIndex((s) => s.id === stepId);
    if (idx !== -1) {
      set({ currentStepIndex: idx, isActive: true, showWelcomeIntro: false });
    }
  },

  advanceActionStep: (expectedStepId: string) => {
    const { currentStepIndex, isActive } = get();
    if (!isActive) return;
    const currentStep = INTERACTIVE_TOUR_STEPS[currentStepIndex];
    if (currentStep && currentStep.id === expectedStepId) {
      if (currentStepIndex < INTERACTIVE_TOUR_STEPS.length - 1) {
        set({ currentStepIndex: currentStepIndex + 1 });
      }
    }
  },

  toggleMinimized: () => {
    set((state) => ({ isMinimized: !state.isMinimized }));
  },

  setMinimized: (minimized: boolean) => {
    set({ isMinimized: minimized });
  },

  setCreateModalOpen: (open: boolean) => {
    set({ isCreateModalOpen: open });
  },

  setTestedLiveDemo: (tested: boolean) => {
    set({ hasTestedLiveDemo: tested });
  },

  openDemoSession: () => {
    set({ isDemoSessionActive: true, hasTestedLiveDemo: true });
  },

  closeDemoSession: () => {
    set({ isDemoSessionActive: false });
  },

  openFeatureGuides: () => {
    set({ showFeatureGuidesSheet: true });
  },

  closeFeatureGuides: () => {
    set({ showFeatureGuidesSheet: false });
  },

  skipTour: async (userId) => {
    set({ isActive: false, showWelcomeIntro: false, currentStepIndex: 0, isMinimized: false, isCreateModalOpen: false });
    if (userId) {
      try {
        await SecureStore.setItemAsync(getTourStorageKey(userId), 'true');
      } catch {
        // Storage failure fallback
      }
    }
  },

  finishTour: async (userId) => {
    set({ isActive: false, showWelcomeIntro: false, currentStepIndex: 0, isMinimized: false, isCreateModalOpen: false });
    if (userId) {
      try {
        await SecureStore.setItemAsync(getTourStorageKey(userId), 'true');
      } catch {
        // Storage failure fallback
      }
    }
  },

  resetTour: async (userId) => {
    if (userId) {
      try {
        await SecureStore.deleteItemAsync(getTourStorageKey(userId));
      } catch {
        // Ignored
      }
    }
    set({
      showWelcomeIntro: true,
      isActive: false,
      isMinimized: false,
      currentStepIndex: 0,
      isDemoSessionActive: false,
      showFeatureGuidesSheet: false,
      isCreateModalOpen: false,
      hasTestedLiveDemo: false,
    });
  },

  checkShouldShow: async (userId, isFaculty) => {
    if (!isFaculty || !userId) return false;
    try {
      const completed = await SecureStore.getItemAsync(getTourStorageKey(userId));
      return completed !== 'true';
    } catch {
      return false;
    }
  },
}));
