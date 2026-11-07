export type DialogButtonStyle = 'default' | 'cancel' | 'destructive';

export interface DialogButton {
  text?: string;
  onPress?: () => void | Promise<void>;
  style?: DialogButtonStyle;
}

export type DialogTone = 'info' | 'success' | 'warning' | 'danger';

const DANGER_TITLE = /\b(error|failed|failure|could not|couldn't|unable|denied|expired)\b/i;
const WARNING_TITLE = /\b(missing|invalid|incomplete|required|no subject|select)\b/i;
const SUCCESS_TITLE = /\b(success|sent|created|approved|linked|deleted|saved|updated|added|ready|done)\b/i;

/** The colour and icon of a dialog, chosen from its buttons and title so call sites need no extra option. */
export function dialogTone(title: string, buttons: DialogButton[]): DialogTone {
  if (buttons.some((b) => b.style === 'destructive')) return 'danger';
  if (DANGER_TITLE.test(title)) return 'danger';
  if (WARNING_TITLE.test(title)) return 'warning';
  if (SUCCESS_TITLE.test(title)) return 'success';
  return 'info';
}

/** A dialog with no buttons still needs a way to close, as with the system alert. */
export function normalizeButtons(buttons?: DialogButton[]): DialogButton[] {
  return buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
}

/** Two short buttons sit side by side; anything else stacks, with Cancel last. */
export function dialogLayout(buttons: DialogButton[]): { direction: 'row' | 'column'; ordered: DialogButton[] } {
  const row = buttons.length <= 2 && buttons.every((b) => (b.text ?? 'OK').length <= 18);
  if (row) return { direction: 'row', ordered: buttons };
  const cancel = buttons.filter((b) => b.style === 'cancel');
  const rest = buttons.filter((b) => b.style !== 'cancel');
  return { direction: 'column', ordered: [...rest, ...cancel] };
}

/** The Button look for each dialog button. Only the first plain button is the highlighted main action. */
export function buttonVariant(button: DialogButton, index: number, all: DialogButton[]): 'primary' | 'secondary' | 'outline' | 'danger' {
  if (button.style === 'destructive') return 'danger';
  if (button.style === 'cancel') return 'outline';
  const firstDefault = all.findIndex((b) => b.style !== 'cancel' && b.style !== 'destructive');
  return index === firstDefault ? 'primary' : 'secondary';
}

/**
 * The button that runs when the user taps outside the dialog or presses the back button.
 * Only dialogs with a Cancel button, or a single harmless OK, can be dismissed that way:
 * a destructive choice is never made by accident.
 */
export function dismissButton(buttons: DialogButton[]): DialogButton | null {
  const cancel = buttons.find((b) => b.style === 'cancel');
  if (cancel) return cancel;
  if (buttons.length === 1 && buttons[0].style !== 'destructive') return buttons[0];
  return null;
}
