package expo.modules.actunimenotifications

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

/** Interrogation périodique de l'API (au mieux toutes les 15 minutes, minimum d'Android) : annonce les nouvelles notifications. */
class PollWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result {
    val store = Store(applicationContext)
    Log.i(TAG, "interrogation : polling=${store.polling} jeton=${store.tokenUsable()} baseline=${store.baseline}")
    // Jeton absent ou expiré : on attend que le membre rouvre l'app, qui le renouvelle.
    if (!store.polling || !store.tokenUsable()) return Result.success()

    val connection = (URL("${store.apiUrl}/notifications?read=false&limit=20").openConnection() as HttpURLConnection).apply {
      connectTimeout = 15_000
      readTimeout = 15_000
      setRequestProperty("Authorization", "Bearer ${store.accessToken}")
      setRequestProperty("Accept", "application/json")
    }
    return try {
      val code = connection.responseCode
      Log.i(TAG, "réponse HTTP $code")
      when (code) {
        200 -> {
          val body = connection.inputStream.bufferedReader().use { it.readText() }
          handle(store, JSONObject(body))
          Result.success()
        }
        401, 403 -> Result.success() // jeton refusé : l'app le renouvellera à sa prochaine ouverture
        else -> Result.retry()
      }
    } catch (e: Exception) {
      Log.w(TAG, "interrogation échouée", e)
      Result.retry()
    } finally {
      connection.disconnect()
    }
  }

  private fun handle(store: Store, response: JSONObject) {
    val items = Parsing.notificationsOf(response.optJSONArray("results") ?: return)
    Log.i(TAG, "${items.size} notification(s) non lue(s)")
    if (items.isEmpty()) return
    val newest = items.maxOf { it.updatedAt }
    // Première interrogation : on ne rejoue pas l'historique, on note seulement où on en est.
    if (store.baseline == null) {
      store.baseline = newest
      return
    }
    val fresh = Parsing.newerThan(items, store.baseline)
    Log.i(TAG, "${fresh.size} à annoncer, autorisation=${Notifier.canNotify(applicationContext)}")
    fresh.forEach { Notifier.show(applicationContext, store, it) }
    if (newest > (store.baseline ?: "")) store.baseline = newest
  }

  companion object {
    private const val TAG = "ActunimeNotif"
    private const val NAME = "actunime-notifications-poll"

    fun schedule(context: Context) {
      val request = PeriodicWorkRequestBuilder<PollWorker>(15, TimeUnit.MINUTES)
        .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
        .build()
      WorkManager.getInstance(context).enqueueUniquePeriodicWork(NAME, ExistingPeriodicWorkPolicy.UPDATE, request)
    }

    /** Lance une vérification tout de suite (bouton « Vérifier maintenant »). */
    fun runOnce(context: Context) {
      WorkManager.getInstance(context).enqueue(OneTimeWorkRequestBuilder<PollWorker>().build())
    }

    fun cancel(context: Context) {
      WorkManager.getInstance(context).cancelUniqueWork(NAME)
    }
  }
}
