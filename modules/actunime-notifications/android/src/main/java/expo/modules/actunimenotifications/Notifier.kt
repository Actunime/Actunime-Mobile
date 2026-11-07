package expo.modules.actunimenotifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/** Une notification de l'API (`GET /notifications` ou événement `notification` de la socket). */
/** `updatedAt` change quand l'API met à jour une notification existante (même identifiant) : c'est lui qui date l'annonce. */
data class IncomingNotification(val id: String, val title: String, val description: String, val link: String?, val createdAt: String, val updatedAt: String = createdAt) {
  val seenKey: String get() = "$id@$updatedAt"
}

object Notifier {
  const val CHANNEL = "actunime_notifications"
  const val LIVE_CHANNEL = "actunime_live"

  fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java)
    manager.createNotificationChannel(NotificationChannel(CHANNEL, "Notifications", NotificationManager.IMPORTANCE_DEFAULT).apply {
      description = "Demandes d'ami, sorties d'épisodes, réponses à tes propositions…"
    })
    manager.createNotificationChannel(NotificationChannel(LIVE_CHANNEL, "Connexion en direct", NotificationManager.IMPORTANCE_MIN).apply {
      description = "Indique que l'app reçoit tes notifications en direct."
      setShowBadge(false)
    })
  }

  /** Le système autorise-t-il l'app à afficher des notifications (permission demandée sur Android 13 et plus) ? */
  fun canNotify(context: Context): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) return false
    return NotificationManagerCompat.from(context).areNotificationsEnabled()
  }

  /** Intention qui ouvre l'app sur une page (schéma `actunime://`), ou son écran d'accueil. */
  fun openIntent(context: Context, route: String?): PendingIntent {
    val intent = if (route != null) {
      Intent(Intent.ACTION_VIEW, Uri.parse("actunime://$route")).setPackage(context.packageName)
    } else {
      context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent()
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(context, route.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  fun show(context: Context, store: Store, item: IncomingNotification) {
    if (!store.firstTimeSeen(item.seenKey)) return
    if (!canNotify(context)) return
    ensureChannels(context)
    val notification = NotificationCompat.Builder(context, CHANNEL)
      .setSmallIcon(context.applicationInfo.icon)
      .setContentTitle(item.title)
      .setContentText(item.description)
      .setStyle(NotificationCompat.BigTextStyle().bigText(item.description))
      .setAutoCancel(true)
      .setContentIntent(openIntent(context, LinkRoutes.routeOf(item.link)))
      .build()
    NotificationManagerCompat.from(context).notify(item.id.hashCode(), notification)
  }
}
