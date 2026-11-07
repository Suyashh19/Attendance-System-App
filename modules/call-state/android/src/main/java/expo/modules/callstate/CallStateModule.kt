package expo.modules.callstate

import android.content.Context
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Tells whether a call is running on this phone right now: a normal phone call or a
 * voice/video call in an app such as WhatsApp. Reads only the audio mode, so it needs
 * no permission and never sees who is calling.
 */
class CallStateModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CallState")

    Function("isInCall") {
      val context = appContext.reactContext ?: return@Function false
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        ?: return@Function false
      isCallMode(audio.mode)
    }
  }

  private fun isCallMode(mode: Int): Boolean {
    if (mode == AudioManager.MODE_IN_CALL || mode == AudioManager.MODE_IN_COMMUNICATION) return true
    // A call moved to another device (Android 13+) is still a call
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      return mode == AudioManager.MODE_CALL_REDIRECT || mode == AudioManager.MODE_COMMUNICATION_REDIRECT
    }
    return false
  }
}
