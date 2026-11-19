jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import * as SecureStore from 'expo-secure-store';
import {
  INTERACTIVE_TOUR_STEPS,
  FACULTY_TOUR_STEPS,
  UNO_WELCOME_MESSAGE,
  UNO_FEATURE_TOPICS,
} from '../constants/onboardingTour';
import { useOnboardingStore, getTourStorageKey } from '../store/onboardingStore';

describe('Uno Onboarding Configuration', () => {
  it('contains the exact friendly welcome message from Uno', () => {
    expect(UNO_WELCOME_MESSAGE).toBe(
      "Welcome, Professor! I'm Uno, your teaching assistant. Let's set up your semester courses, live attendance, and reports in a few quick steps."
    );
  });

  it('defines the 18 interactive walkthrough steps covering the 8 core tasks', () => {
    expect(INTERACTIVE_TOUR_STEPS.length).toBe(18);
    const stepIds = INTERACTIVE_TOUR_STEPS.map((s) => s.id);
    expect(stepIds).toContain('uno_welcome');
    expect(stepIds).toContain('tap_new_subject');
    expect(stepIds).toContain('enter_subject_name');
    expect(stepIds).toContain('enter_subject_code');
    expect(stepIds).toContain('pick_academic_term');
    expect(stepIds).toContain('tap_create_button');
    expect(stepIds).toContain('navigate_to_settings');
    expect(stepIds).toContain('settings_semester_months');
    expect(stepIds).toContain('settings_attendance_preferences');
    expect(stepIds).toContain('home_start_attendance');
    expect(stepIds).toContain('tap_open_roster');
    expect(stepIds).toContain('explain_roster_management');
    expect(stepIds).toContain('navigate_to_leaves');
    expect(stepIds).toContain('explain_leaves_view');
    expect(stepIds).toContain('navigate_to_reports');
    expect(stepIds).toContain('explain_reports_export');
    expect(stepIds).toContain('walkthrough_finished');
  });

  it('ensures every interactive step has taskTitle, unoSpeech, icon, and targetKey', () => {
    for (const step of INTERACTIVE_TOUR_STEPS) {
      expect(step.taskTitle.length).toBeGreaterThan(3);
      expect(step.unoSpeech.length).toBeGreaterThan(15);
      expect(step.icon).toBeDefined();
      expect(step.targetKey.startsWith('tour_')).toBe(true);
      expect(step.taskNumber).toBeGreaterThanOrEqual(1);
      expect(step.taskNumber).toBeLessThanOrEqual(8);
    }
  });

  it('provides feature topics for individual chapter exploration', () => {
    expect(UNO_FEATURE_TOPICS.length).toBeGreaterThanOrEqual(5);
    for (const topic of UNO_FEATURE_TOPICS) {
      expect(topic.title).toBeDefined();
      expect(topic.summary).toBeDefined();
      expect(topic.stepIndex).toBeGreaterThanOrEqual(0);
      expect(topic.stepIndex).toBeLessThan(INTERACTIVE_TOUR_STEPS.length);
      expect(topic.stepId).toBeDefined();
    }
  });
});

describe('useOnboardingStore state machine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOnboardingStore.setState({
      showWelcomeIntro: false,
      isActive: false,
      isMinimized: false,
      currentStepIndex: 0,
      isDemoSessionActive: false,
      showFeatureGuidesSheet: false,
      targets: {},
    });
  });

  it('opens and closes the Uno welcome intro modal', () => {
    const store = useOnboardingStore.getState();
    expect(store.showWelcomeIntro).toBe(false);

    store.showWelcome();
    expect(useOnboardingStore.getState().showWelcomeIntro).toBe(true);
    expect(useOnboardingStore.getState().isActive).toBe(false);

    store.closeWelcome();
    expect(useOnboardingStore.getState().showWelcomeIntro).toBe(false);
  });

  it('starts the tour and closes the welcome modal', () => {
    const store = useOnboardingStore.getState();
    store.showWelcome();
    expect(useOnboardingStore.getState().showWelcomeIntro).toBe(true);

    store.startTour(0);
    expect(useOnboardingStore.getState().isActive).toBe(true);
    expect(useOnboardingStore.getState().showWelcomeIntro).toBe(false);
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);
  });

  it('progresses through steps with bounds checking', () => {
    const store = useOnboardingStore.getState();
    store.startTour();

    store.nextStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(1);

    store.prevStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);

    store.prevStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);

    const maxIndex = INTERACTIVE_TOUR_STEPS.length - 1;
    store.goToStep(maxIndex);
    expect(useOnboardingStore.getState().currentStepIndex).toBe(maxIndex);

    store.nextStep();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(maxIndex);
  });

  it('advances on specific action steps only when matching expected step', () => {
    const store = useOnboardingStore.getState();
    store.startTour(2); // 'tap_new_subject'
    expect(INTERACTIVE_TOUR_STEPS[2].id).toBe('tap_new_subject');

    // Wrong step doesn't advance
    store.advanceActionStep('wrong_step');
    expect(useOnboardingStore.getState().currentStepIndex).toBe(2);

    // Correct step advances
    store.advanceActionStep('tap_new_subject');
    expect(useOnboardingStore.getState().currentStepIndex).toBe(3);
    expect(INTERACTIVE_TOUR_STEPS[3].id).toBe('enter_subject_name');
  });

  it('toggles and sets minimized state', () => {
    const store = useOnboardingStore.getState();
    expect(store.isMinimized).toBe(false);

    store.toggleMinimized();
    expect(useOnboardingStore.getState().isMinimized).toBe(true);

    store.setMinimized(false);
    expect(useOnboardingStore.getState().isMinimized).toBe(false);
  });

  it('navigates by stepId directly', () => {
    const store = useOnboardingStore.getState();
    store.startTour();

    store.goToStepId('settings_semester_months');
    const expectedIndex = INTERACTIVE_TOUR_STEPS.findIndex((s) => s.id === 'settings_semester_months');
    expect(useOnboardingStore.getState().currentStepIndex).toBe(expectedIndex);
  });

  it('manages demo session modal state and tracks tested status', () => {
    const store = useOnboardingStore.getState();
    expect(store.isDemoSessionActive).toBe(false);
    expect(store.hasTestedLiveDemo).toBe(false);

    store.openDemoSession();
    expect(useOnboardingStore.getState().isDemoSessionActive).toBe(true);
    expect(useOnboardingStore.getState().hasTestedLiveDemo).toBe(true);

    store.closeDemoSession();
    expect(useOnboardingStore.getState().isDemoSessionActive).toBe(false);
    expect(useOnboardingStore.getState().hasTestedLiveDemo).toBe(true);

    store.setTestedLiveDemo(false);
    expect(useOnboardingStore.getState().hasTestedLiveDemo).toBe(false);
  });

  it('manages feature guides sheet state', () => {
    const store = useOnboardingStore.getState();
    expect(store.showFeatureGuidesSheet).toBe(false);

    store.openFeatureGuides();
    expect(useOnboardingStore.getState().showFeatureGuidesSheet).toBe(true);

    store.closeFeatureGuides();
    expect(useOnboardingStore.getState().showFeatureGuidesSheet).toBe(false);
  });

  it('registers and unregisters target measurements', () => {
    const store = useOnboardingStore.getState();
    store.registerTarget('tour_new_subject', {
      x: 200,
      y: 60,
      width: 120,
      height: 44,
      borderRadius: 24,
    });

    expect(useOnboardingStore.getState().targets['tour_new_subject']).toEqual({
      x: 200,
      y: 60,
      width: 120,
      height: 44,
      borderRadius: 24,
    });

    store.unregisterTarget('tour_new_subject');
    expect(useOnboardingStore.getState().targets['tour_new_subject']).toBeUndefined();
  });

  it('skips the tour and writes completion to SecureStore', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    const store = useOnboardingStore.getState();
    store.startTour(2);

    await store.skipTour('faculty_44');

    expect(useOnboardingStore.getState().isActive).toBe(false);
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      getTourStorageKey('faculty_44'),
      'true'
    );
  });

  it('finishes the tour and writes completion to SecureStore', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    const store = useOnboardingStore.getState();
    store.startTour(16);

    await store.finishTour('faculty_55');

    expect(useOnboardingStore.getState().isActive).toBe(false);
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      getTourStorageKey('faculty_55'),
      'true'
    );
  });

  it('resets tour from Settings and opens Uno welcome modal', async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    const store = useOnboardingStore.getState();

    await store.resetTour('faculty_99');

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      getTourStorageKey('faculty_99')
    );
    expect(useOnboardingStore.getState().showWelcomeIntro).toBe(true);
    expect(useOnboardingStore.getState().isActive).toBe(false);
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);
  });

  it('checks shouldShow only for first-time faculty login', async () => {
    const store = useOnboardingStore.getState();

    expect(await store.checkShouldShow('student_1', false)).toBe(false);

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    expect(await store.checkShouldShow('faculty_new', true)).toBe(true);

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');
    expect(await store.checkShouldShow('faculty_done', true)).toBe(false);
  });
});
