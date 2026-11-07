/**
 * Plain-language wording for a failed attendance attempt.
 *
 * The server sends a technical reason ("Device mismatch. Expected registered device.").
 * This only changes what the student READS in the result popup: the raw reason is still what the
 * rest of the screen uses to decide which check failed, so the server text must not be reworded.
 */

export interface FriendlyFailure {
  title: string;
  /** What went wrong and what to do next */
  desc: string;
}

const FAILURE_TITLE = "Couldn't mark attendance";

// Order matters: the more specific wording is tested first
const RULES: { test: (reason: string) => boolean; desc: string }[] = [
  {
    test: (r) => r.includes('another user'),
    desc: "This phone is already linked to another student's account. Please speak to your teacher.",
  },
  {
    test: (r) => r.includes('device mismatch') || r.includes('registered device'),
    desc: "This isn't the phone linked to your account. Open Profile and tap Use This Phone to link it (once every 30 days), or ask your teacher to mark you present.",
  },
  {
    test: (r) => r.includes('device_id') || r.includes('device id'),
    desc: "We couldn't read this phone's ID. Close the app, open it again and retry next time, or ask your teacher to mark you present.",
  },
  {
    test: (r) => r.includes('expired') || r.includes('too late') || r.includes('late'),
    desc: 'You were a few seconds late. Ask your teacher to mark you present.',
  },
  {
    test: (r) => r.includes('incorrect') && r.includes('code'),
    desc: 'The code was entered wrongly too many times. Ask your teacher to mark you present.',
  },
  {
    test: (r) => r.includes('pending approval') || r.includes('rejected'),
    desc: "Your teacher hasn't approved you for this subject yet. Check with them.",
  },
  {
    test: (r) => r.includes('not enrolled'),
    desc: "You aren't enrolled in this subject. Enroll with the subject code from your teacher first.",
  },
  {
    test: (r) => r.includes('no longer active') || r.includes('does not exist') || r.includes('closed'),
    desc: 'This attendance session has already been closed by your teacher.',
  },
];

/**
 * Friendly title and next step for an INVALID attempt.
 * A reason that is not recognised is shown as it came, so nothing is ever hidden.
 */
export function friendlyFailure(reason?: string | null): FriendlyFailure {
  const raw = (reason ?? '').trim();
  if (!raw) {
    return { title: FAILURE_TITLE, desc: 'Verification failed for this attempt. Ask your teacher to mark you present.' };
  }

  const lower = raw.toLowerCase();
  const rule = RULES.find((r) => r.test(lower));
  return { title: FAILURE_TITLE, desc: rule ? rule.desc : `Reason: ${raw}` };
}
