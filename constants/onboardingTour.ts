import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type TourIconName = ComponentProps<typeof Ionicons>['name'];

export const UNO_WELCOME_MESSAGE =
  "Welcome, Professor! I'm Uno, your teaching assistant. Let's set up your semester courses, live attendance, and reports in a few quick steps.";

export interface InteractiveStep {
  id: string;
  taskTitle: string;
  taskNumber: number;
  totalTasks: number;
  unoSpeech: string;
  actionHint: string;
  targetKey: string;
  icon: TourIconName;
  screen?: string;
  requiresAction?: boolean;
  buttonLabel?: string;
  hasDemoAction?: boolean;
  autoAdvanceOnTargetTap?: boolean;
  placement?: 'top' | 'bottom';
  pointerDirection?: 'up' | 'down' | 'none';
}

export const INTERACTIVE_TOUR_STEPS: InteractiveStep[] = [
  // Task 1: Welcome & Dashboard
  {
    id: 'uno_welcome',
    taskTitle: 'Welcome to Faculty Hub',
    taskNumber: 1,
    totalTasks: 8,
    unoSpeech:
      "Welcome, Professor! I'm Uno, your teaching assistant. Let's take a quick hands-on tour of your dashboard.",
    actionHint: 'Tap "Start Hands-On Tour" to begin.',
    targetKey: 'tour_dashboard_header',
    icon: 'sparkles',
    screen: 'home',
    buttonLabel: 'Start Hands-On Tour',
    placement: 'top',
    pointerDirection: 'up',
  },
  {
    id: 'dashboard_overview',
    taskTitle: 'Dashboard Overview',
    taskNumber: 1,
    totalTasks: 8,
    unoSpeech:
      'Here is your academic dashboard to monitor active terms, running lectures, and course cards.',
    actionHint: 'Review your dashboard, then tap Next.',
    targetKey: 'tour_dashboard_header',
    icon: 'easel-outline',
    screen: 'home',
    buttonLabel: 'Next: Create a Subject',
    placement: 'top',
    pointerDirection: 'up',
  },

  // Task 2: Subject Creation (Field-by-Field)
  {
    id: 'tap_new_subject',
    taskTitle: 'Create Subject · Step 1',
    taskNumber: 2,
    totalTasks: 8,
    unoSpeech:
      "Let's set up your first course. Tap '+ New subject' above to begin.",
    actionHint: "Tap '+ New subject' at the top.",
    targetKey: 'tour_new_subject',
    icon: 'add-circle-outline',
    screen: 'home',
    requiresAction: true,
    autoAdvanceOnTargetTap: true,
    buttonLabel: 'Tap "+ New subject"',
    placement: 'top',
    pointerDirection: 'up',
  },
  {
    id: 'enter_subject_name',
    taskTitle: 'Create Subject · Step 2',
    taskNumber: 2,
    totalTasks: 8,
    unoSpeech:
      'Enter your course title in the highlighted field (e.g., Distributed Systems).',
    actionHint: 'Enter course name.',
    targetKey: 'tour_input_subject_name',
    icon: 'school-outline',
    requiresAction: true,
    buttonLabel: 'Next Field',
    placement: 'top',
    pointerDirection: 'none',
  },
  {
    id: 'enter_subject_code',
    taskTitle: 'Create Subject · Step 3',
    taskNumber: 2,
    totalTasks: 8,
    unoSpeech:
      'Enter a unique course code (e.g., CS301) for students to join your class.',
    actionHint: 'Enter course code.',
    targetKey: 'tour_input_subject_code',
    icon: 'pricetag-outline',
    requiresAction: true,
    buttonLabel: 'Next Field',
    placement: 'top',
    pointerDirection: 'none',
  },
  {
    id: 'pick_academic_term',
    taskTitle: 'Create Subject · Step 4',
    taskNumber: 2,
    totalTasks: 8,
    unoSpeech:
      'Select the academic year, semester term, and Theory or Practical format.',
    actionHint: 'Select year, semester, and course type.',
    targetKey: 'tour_create_options',
    icon: 'layers-outline',
    buttonLabel: 'Next',
    placement: 'top',
    pointerDirection: 'none',
  },
  {
    id: 'tap_create_button',
    taskTitle: 'Create Subject · Step 5',
    taskNumber: 2,
    totalTasks: 8,
    unoSpeech:
      "Course details confirmed! Tap 'Create' to register it to your roster.",
    actionHint: "Tap 'Create' to save.",
    targetKey: 'tour_create_button',
    icon: 'checkmark-circle-outline',
    requiresAction: true,
    autoAdvanceOnTargetTap: true,
    buttonLabel: 'Tap "Create"',
    placement: 'top',
    pointerDirection: 'none',
  },

  // Task 3: Semester Configuration
  {
    id: 'navigate_to_settings',
    taskTitle: 'Academic Setup · Step 1',
    taskNumber: 3,
    totalTasks: 8,
    unoSpeech:
      "Course registered! Now let's configure your semester calendar in Settings.",
    actionHint: 'Tap "Go to Settings" below.',
    targetKey: 'tour_dashboard_header',
    icon: 'settings-outline',
    buttonLabel: 'Go to Settings',
    placement: 'bottom',
    pointerDirection: 'none',
  },
  {
    id: 'settings_semester_months',
    taskTitle: 'Academic Setup · Step 2',
    taskNumber: 3,
    totalTasks: 8,
    unoSpeech:
      'Define your Odd and Even semester months to calculate accurate student percentages.',
    actionHint: 'Review semester calendar, then tap Next.',
    targetKey: 'tour_settings_months',
    icon: 'calendar-outline',
    screen: 'settings',
    buttonLabel: 'Next: Preferences',
    placement: 'bottom',
    pointerDirection: 'none',
  },

  // Task 4: Preferences & Attendance Duration
  {
    id: 'settings_attendance_preferences',
    taskTitle: 'Preferences · Attendance Time',
    taskNumber: 4,
    totalTasks: 8,
    unoSpeech:
      'Set your attendance window (10s to 15s) for live student verification.',
    actionHint: 'Review duration, then tap "Next: Live Attendance".',
    targetKey: 'tour_settings_preferences',
    icon: 'time-outline',
    screen: 'settings',
    buttonLabel: 'Next: Live Attendance',
    placement: 'bottom',
    pointerDirection: 'none',
  },

  // Task 5: Taking Live Attendance & Simulation
  {
    id: 'home_start_attendance',
    taskTitle: 'Live Attendance · Step 1',
    taskNumber: 5,
    totalTasks: 8,
    unoSpeech:
      "In class, tap 'Start' to broadcast the live 4-digit code. Tap Start to test it!",
    actionHint: "Tap 'Start' on your subject card above.",
    targetKey: 'tour_start_button',
    icon: 'play-circle-outline',
    screen: 'home',
    hasDemoAction: true,
    requiresAction: true,
    buttonLabel: 'Tap Start on Subject Card',
    placement: 'bottom',
    pointerDirection: 'none',
  },

  // Task 6: Class Roster & Student Management
  {
    id: 'tap_open_roster',
    taskTitle: 'Class Roster · Step 1',
    taskNumber: 6,
    totalTasks: 8,
    unoSpeech:
      'Tap the highlighted arrow (>) on your subject card to inspect roster and lecture logs.',
    actionHint: "Tap the '>' arrow on your subject card.",
    targetKey: 'tour_roster_management',
    icon: 'people-outline',
    screen: 'home',
    requiresAction: true,
    autoAdvanceOnTargetTap: true,
    buttonLabel: "Tap '>' Arrow",
    placement: 'bottom',
    pointerDirection: 'none',
  },
  {
    id: 'explain_roster_management',
    taskTitle: 'Class Roster · Step 2',
    taskNumber: 6,
    totalTasks: 8,
    unoSpeech:
      'Manage enrollments and manually adjust attendance if a student had connectivity issues.',
    actionHint: 'Review roster tools, then tap Next.',
    targetKey: 'tour_subject_roster_view',
    icon: 'create-outline',
    buttonLabel: 'Next: Leave Requests',
    placement: 'bottom',
    pointerDirection: 'none',
  },

  // Task 7: Student Leave Requests
  {
    id: 'navigate_to_leaves',
    taskTitle: 'Leave Requests · Step 1',
    taskNumber: 7,
    totalTasks: 8,
    unoSpeech:
      'Track duty and medical leaves. Tap the Leave requests card above.',
    actionHint: 'Tap Leave requests card above.',
    targetKey: 'tour_leave_requests',
    icon: 'document-text-outline',
    screen: 'home',
    requiresAction: true,
    autoAdvanceOnTargetTap: true,
    buttonLabel: 'Tap Leave Requests',
    placement: 'top',
    pointerDirection: 'up',
  },
  {
    id: 'explain_leaves_view',
    taskTitle: 'Leave Requests · Step 2',
    taskNumber: 7,
    totalTasks: 8,
    unoSpeech:
      "Approved leaves mark students 'Excused', safeguarding their percentage accurately.",
    actionHint: 'Review leave policies, then tap Next.',
    targetKey: 'tour_leave_requests_view',
    icon: 'shield-checkmark-outline',
    buttonLabel: 'Next: Reports & Export',
    placement: 'bottom',
    pointerDirection: 'none',
  },

  // Task 8: Reports & Excel Export
  {
    id: 'navigate_to_reports',
    taskTitle: 'Reports & Export · Step 1',
    taskNumber: 8,
    totalTasks: 8,
    unoSpeech:
      "Tap the 'Reports' tab below to review historical analytics and export logs.",
    actionHint: "Tap the Reports tab below.",
    targetKey: 'tour_reports_tab',
    icon: 'bar-chart-outline',
    requiresAction: true,
    autoAdvanceOnTargetTap: true,
    buttonLabel: 'Tap Reports Tab',
    placement: 'bottom',
    pointerDirection: 'down',
  },
  {
    id: 'explain_reports_export',
    taskTitle: 'Reports & Export · Step 2',
    taskNumber: 8,
    totalTasks: 8,
    unoSpeech:
      'Export formatted Excel (.xlsx) attendance sheets by date range for university submission.',
    actionHint: 'Tap Finish Walkthrough to complete.',
    targetKey: 'tour_reports_export_action',
    icon: 'download-outline',
    screen: 'history',
    buttonLabel: 'Finish Walkthrough',
    placement: 'bottom',
    pointerDirection: 'none',
  },
  {
    id: 'walkthrough_finished',
    taskTitle: 'Walkthrough Complete',
    taskNumber: 8,
    totalTasks: 8,
    unoSpeech:
      "You're all set, Professor! Your system is ready. I'm always available in Settings if you need assistance.",
    actionHint: 'Tap Done to return to your dashboard.',
    targetKey: 'tour_dashboard_header',
    icon: 'ribbon-outline',
    buttonLabel: 'Done & Return Home',
    placement: 'bottom',
    pointerDirection: 'none',
  },
];

// Backwards-compatible alias for existing imports
export const FACULTY_TOUR_STEPS = INTERACTIVE_TOUR_STEPS.map((s) => ({
  id: s.id,
  topic: s.taskTitle,
  title: s.taskTitle,
  unoSpeech: s.unoSpeech,
  description: s.unoSpeech,
  targetKey: s.targetKey,
  icon: s.icon,
  hasDemoAction: s.hasDemoAction,
}));

export interface FeatureGuideTopic {
  id: string;
  title: string;
  summary: string;
  icon: TourIconName;
  stepId: string;
  stepIndex: number;
}

export const UNO_FEATURE_TOPICS: FeatureGuideTopic[] = [
  {
    id: 'subjects',
    title: 'Creating & Managing Subjects',
    summary: 'Subject codes, Theory vs Practical, and Academic years.',
    icon: 'book-outline',
    stepId: 'tap_new_subject',
    stepIndex: 2,
  },
  {
    id: 'calendar',
    title: 'Academic Calendar Setup',
    summary: 'Configuring Odd and Even semester months in Settings.',
    icon: 'calendar-outline',
    stepId: 'settings_semester_months',
    stepIndex: 8,
  },
  {
    id: 'preferences',
    title: 'Attendance Time & Preferences',
    summary: 'Configure code countdown seconds (15s/30s) and preferences.',
    icon: 'time-outline',
    stepId: 'settings_attendance_preferences',
    stepIndex: 9,
  },
  {
    id: 'attendance',
    title: 'Live Attendance & 4-Digit Code',
    summary: 'Starting countdown sessions, anti-proxy rules, and demo simulation.',
    icon: 'play-circle-outline',
    stepId: 'home_start_attendance',
    stepIndex: 10,
  },
  {
    id: 'roster',
    title: 'Class Roster & Manual Edits',
    summary: 'Approving enrollments and correcting student attendance.',
    icon: 'people-outline',
    stepId: 'tap_open_roster',
    stepIndex: 11,
  },
  {
    id: 'leaves',
    title: 'Student Leave Requests',
    summary: 'Reviewing leaves and automatic Excused percentage calculations.',
    icon: 'document-text-outline',
    stepId: 'navigate_to_leaves',
    stepIndex: 13,
  },
  {
    id: 'reports',
    title: 'Reports & Excel Export',
    summary: 'Viewing percentage stats and downloading .xlsx spreadsheets.',
    icon: 'bar-chart-outline',
    stepId: 'navigate_to_reports',
    stepIndex: 15,
  },
];
