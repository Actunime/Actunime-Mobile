package expo.modules.actunimenotifications

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ActunimeNotificationsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("Contexte indisponible")

  private fun start(intent: Intent) {
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  override fun definition() = ModuleDefinition {
    Name("ActunimeNotifications")

    /** Copie la session de l'app (adresse de l'API, jeton d'accès, échéance en ms) et applique les réglages. */
    Function("setCredentials") { apiUrl: String, accessToken: String, expiresAt: Double ->
      val store = Store(context)
      store.apiUrl = apiUrl.trimEnd('/')
      store.accessToken = accessToken
      store.expiresAt = expiresAt.toLong()
      Notifier.ensureChannels(context)
      if (store.polling) PollWorker.schedule(context) else PollWorker.cancel(context)
      if (store.instant) InstantService.start(context)
    }

    Function("clearCredentials") {
      PollWorker.cancel(context)
      InstantService.stop(context)
      Store(context).clearSession()
    }

    Function("setPolling") { enabled: Boolean ->
      val store = Store(context)
      store.polling = enabled
      if (enabled && store.tokenUsable()) PollWorker.schedule(context) else PollWorker.cancel(context)
    }

    Function("checkNow") {
      PollWorker.runOnce(context)
    }

    Function("setInstant") { enabled: Boolean ->
      val store = Store(context)
      store.instant = enabled
      if (enabled && store.tokenUsable()) InstantService.start(context) else InstantService.stop(context)
    }

    Function("getStatus") {
      val store = Store(context)
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      mapOf(
        "polling" to store.polling,
        "instant" to store.instant,
        "canNotify" to Notifier.canNotify(context),
        "batteryExempt" to power.isIgnoringBatteryOptimizations(context.packageName),
        "sessionReady" to store.tokenUsable(),
      )
    }

    /** Demande au système d'exclure l'app de l'optimisation de batterie (recommandé pour le mode instantané). */
    Function("openBatterySettings") {
      try {
        start(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}")))
      } catch (e: Exception) {
        start(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
      }
    }

    Function("openNotificationSettings") {
      val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      start(intent)
    }
  }
}
