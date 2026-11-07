import { requireOptionalNativeModule } from 'expo';

type CallStateNative = { isInCall(): boolean };

// Android only; on other platforms (and in tests) the module is missing and no call is ever reported
const native = requireOptionalNativeModule<CallStateNative>('CallState');

/** True while a phone call or an in-app voice/video call is running on this phone. */
export function isInCall(): boolean {
  try {
    return native?.isInCall() ?? false;
  } catch {
    return false;
  }
}
