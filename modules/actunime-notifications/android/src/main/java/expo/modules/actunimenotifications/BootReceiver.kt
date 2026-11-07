package expo.modules.actunimenotifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Après un redémarrage ou une mise à jour de l'app : relance le mode instantané s'il était activé. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val store = Store(context)
    if (store.instant && store.tokenUsable()) InstantService.start(context)
  }
}
