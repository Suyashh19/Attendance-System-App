import { Share } from 'react-native';
import { showAlert } from '../store/dialogStore';
import type { Subject } from '../types';
import { shareMessage } from './subjectText';

/** Opens the phone's share sheet (WhatsApp, Messages, ...) with the join message for a subject. */
export async function shareSubjectCode(subject: Pick<Subject, 'name' | 'code' | 'type' | 'span'>): Promise<void> {
  try {
    await Share.share({ message: shareMessage(subject) });
  } catch {
    showAlert('Could not share', 'Please try again.');
  }
}

/** Confirms a new subject was created and offers to send its code to students straight away. */
export function offerToShareSubject(subject: Subject, title = 'Subject created'): void {
  showAlert(
    title,
    `${subject.name} is ready. Share the code ${subject.code} so your students can join.`,
    [
      { text: 'Done', style: 'cancel' },
      { text: 'Share code', onPress: () => void shareSubjectCode(subject) },
    ]
  );
}
