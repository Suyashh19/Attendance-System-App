import {
  buttonVariant,
  dialogLayout,
  dialogTone,
  dismissButton,
  normalizeButtons,
  type DialogButton,
} from '../utils/dialog';
import { showAlert, useDialogStore } from '../store/dialogStore';

const cancel: DialogButton = { text: 'Cancel', style: 'cancel' };
const ok: DialogButton = { text: 'OK' };
const remove: DialogButton = { text: 'Remove', style: 'destructive' };

describe('dialogTone', () => {
  it('is danger for destructive choices and failures', () => {
    expect(dialogTone('Remove from class', [cancel, remove])).toBe('danger');
    for (const title of ['Error', 'Login Failed', 'Could not enroll', 'Export Failed', 'Registration Failed']) {
      expect(dialogTone(title, [ok])).toBe('danger');
    }
  });

  it('is warning for missing or invalid input', () => {
    for (const title of ['Missing details', 'Invalid Range', 'No Subject Selected']) {
      expect(dialogTone(title, [ok])).toBe('warning');
    }
  });

  it('is success for completed actions', () => {
    for (const title of ['Success', 'Request Sent', 'Phone Linked', 'OTP Sent', 'Approved', 'Account Deleted', 'Subject created']) {
      expect(dialogTone(title, [ok])).toBe('success');
    }
  });

  it('is info for questions', () => {
    expect(dialogTone('Approve all requests', [cancel, { text: 'Approve all' }])).toBe('info');
  });

  it('prefers failure over success wording', () => {
    expect(dialogTone('Could not send code', [ok])).toBe('danger');
  });
});

describe('dialogLayout', () => {
  it('puts one or two short buttons side by side, in the given order', () => {
    expect(dialogLayout([ok]).direction).toBe('row');
    const two = dialogLayout([cancel, { text: 'Delete' }]);
    expect(two.direction).toBe('row');
    expect(two.ordered.map((b) => b.text)).toEqual(['Cancel', 'Delete']);
  });

  it('stacks three buttons or long labels, with Cancel last', () => {
    const three = dialogLayout([cancel, { text: 'Save' }, { text: 'Discard' }]);
    expect(three.direction).toBe('column');
    expect(three.ordered.map((b) => b.text)).toEqual(['Save', 'Discard', 'Cancel']);

    expect(dialogLayout([cancel, { text: 'Delete this entire subject' }]).direction).toBe('column');
  });
});

describe('buttonVariant', () => {
  it('styles destructive, cancel and the main action', () => {
    const all = [cancel, remove];
    expect(buttonVariant(cancel, 0, all)).toBe('outline');
    expect(buttonVariant(remove, 1, all)).toBe('danger');
    const plain = [cancel, { text: 'Share code' }];
    expect(buttonVariant(plain[1], 1, plain)).toBe('primary');
  });

  it('highlights only the first plain button', () => {
    const all = [{ text: 'A' }, { text: 'B' }];
    expect(buttonVariant(all[0], 0, all)).toBe('primary');
    expect(buttonVariant(all[1], 1, all)).toBe('secondary');
  });
});

describe('dismissButton', () => {
  it('is the Cancel button when there is one', () => {
    expect(dismissButton([cancel, remove])).toBe(cancel);
  });

  it('is the only button when it is harmless', () => {
    expect(dismissButton([ok])).toBe(ok);
  });

  it('is nothing for a lone destructive button or a choice without Cancel', () => {
    expect(dismissButton([remove])).toBeNull();
    expect(dismissButton([{ text: 'Yes' }, { text: 'No' }])).toBeNull();
  });
});

describe('normalizeButtons', () => {
  it('gives an OK button to a dialog that has none', () => {
    expect(normalizeButtons()).toEqual([{ text: 'OK' }]);
    expect(normalizeButtons([])).toEqual([{ text: 'OK' }]);
    expect(normalizeButtons([cancel])).toEqual([cancel]);
  });
});

describe('showAlert queue', () => {
  beforeEach(() => useDialogStore.setState({ current: null, queue: [] }));

  it('shows the first dialog straight away', () => {
    showAlert('Hello', 'World');
    const { current, queue } = useDialogStore.getState();
    expect(current?.title).toBe('Hello');
    expect(current?.message).toBe('World');
    expect(current?.buttons).toEqual([{ text: 'OK' }]);
    expect(queue).toHaveLength(0);
  });

  it('queues dialogs raised while one is open and shows them in order', () => {
    showAlert('First');
    showAlert('Second');
    showAlert('Third');
    expect(useDialogStore.getState().current?.title).toBe('First');
    expect(useDialogStore.getState().queue).toHaveLength(2);

    useDialogStore.getState().close();
    expect(useDialogStore.getState().current?.title).toBe('Second');
    useDialogStore.getState().close();
    expect(useDialogStore.getState().current?.title).toBe('Third');
    useDialogStore.getState().close();
    expect(useDialogStore.getState().current).toBeNull();
  });

  it('gives every dialog its own id, so the same text twice still animates in again', () => {
    showAlert('Same');
    const firstId = useDialogStore.getState().current!.id;
    useDialogStore.getState().close();
    showAlert('Same');
    expect(useDialogStore.getState().current!.id).not.toBe(firstId);
  });
});
