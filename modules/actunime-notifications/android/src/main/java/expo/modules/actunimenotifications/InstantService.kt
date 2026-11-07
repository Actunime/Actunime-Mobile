package expo.modules.actunimenotifications

import android.app.Notification
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URI

/**
 * Mode « notifications instantanées » : un service au premier plan garde la socket `/notifications` de l'API ouverte
 * (la même que celle du site, authentifiée par `auth.token`) et affiche chaque notification reçue. Android impose la
 * notification permanente qui indique l'état de la connexion.
 */
class InstantService : Service() {
  private var socket: Socket? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Notifier.ensureChannels(this)
    startAsForeground("Connexion…")
    val store = Store(this)
    if (!store.instant) {
      stopSelf()
      return START_NOT_STICKY
    }
    if (!store.tokenUsable()) {
      update("Ouvre Actunime pour te reconnecter")
      return START_STICKY
    }
    connect(store)
    return START_STICKY
  }

  private fun connect(store: Store) {
    socket?.off()
    socket?.disconnect()
    val options = IO.Options().apply {
      transports = arrayOf("websocket")
      reconnection = true
      auth = mapOf("token" to store.accessToken!!)
    }
    val next = IO.socket(URI.create("${store.apiUrl}/notifications"), options)
    next.on(Socket.EVENT_CONNECT) { update("Notifications en direct activées") }
    next.on(Socket.EVENT_DISCONNECT) { update("Reconnexion…") }
    next.on(Socket.EVENT_CONNECT_ERROR) { update("Serveur injoignable, nouvelle tentative…") }
    next.on("notification") { args ->
      val json = args.firstOrNull() as? JSONObject ?: return@on
      Parsing.notificationOf(json)?.let { item ->
        Notifier.show(applicationContext, store, item)
        if (item.updatedAt > (store.baseline ?: "")) store.baseline = item.updatedAt
      }
    }
    socket = next
    next.connect()
  }

  private fun build(text: String): Notification =
    NotificationCompat.Builder(this, Notifier.LIVE_CHANNEL)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Actunime")
      .setContentText(text)
      .setOngoing(true)
      .setSilent(true)
      .setContentIntent(Notifier.openIntent(this, null))
      .build()

  private fun startAsForeground(text: String) {
    val notification = build(text)
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun update(text: String) {
    if (!Notifier.canNotify(this)) return
    NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, build(text))
  }

  override fun onDestroy() {
    socket?.off()
    socket?.disconnect()
    socket = null
    super.onDestroy()
  }

  companion object {
    private const val NOTIFICATION_ID = 4101

    fun start(context: Context) {
      ContextCompat.startForegroundService(context, Intent(context, InstantService::class.java))
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, InstantService::class.java))
    }
  }
}
