package expo.modules.actunimeupdater

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageInstaller
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * Mise à jour de l'app par elle-même : téléchargement de l'APK (empreinte SHA-256 vérifiée à la volée), puis
 * installation par `PackageInstaller`. Android refuse d'installer un APK signé par une autre clé : la signature fait
 * la vraie garantie d'origine, l'empreinte protège contre un téléchargement tronqué ou corrompu.
 */
class ActunimeUpdaterModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("NO_CONTEXT", "Contexte Android indisponible", null)

  private var receiver: BroadcastReceiver? = null

  override fun definition() = ModuleDefinition {
    Name("ActunimeUpdater")

    Events("onProgress")

    OnDestroy { unregister() }

    /** Version installée : `versionCode` (comparé à celui de la fiche de version) et nom lisible. */
    Function("getInstalled") {
      val info = context.packageManager.getPackageInfo(context.packageName, 0)
      val code = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()
      mapOf("versionCode" to code, "versionName" to (info.versionName ?: ""))
    }

    /** L'utilisateur a-t-il autorisé cette app à installer des APK ? */
    Function("canInstall") { context.packageManager.canRequestPackageInstalls() }

    /** Ouvre l'écran Android « Installer des applis inconnues » de cette app. */
    Function("openInstallSettings") {
      val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    /** Télécharge l'APK et vérifie son empreinte. Renvoie le chemin du fichier. */
    AsyncFunction("download") { url: String, sha256: String, promise: Promise ->
      Thread {
        try {
          promise.resolve(downloadVerified(url, sha256))
        } catch (error: CodedException) {
          promise.reject(error)
        } catch (error: Exception) {
          promise.reject(CodedException("DOWNLOAD_FAILED", error.message ?: "Téléchargement impossible", error))
        }
      }.start()
    }

    /**
     * Lance l'installation. Résout `installed` (rarement vu : l'app est remplacée) ou `user-action` quand Android
     * affiche sa propre confirmation ; rejette si le système refuse.
     */
    AsyncFunction("install") { path: String, promise: Promise ->
      try {
        install(File(path), promise)
      } catch (error: CodedException) {
        promise.reject(error)
      } catch (error: Exception) {
        promise.reject(CodedException("INSTALL_FAILED", error.message ?: "Installation impossible", error))
      }
    }
  }

  private fun downloadVerified(url: String, expectedSha256: String): String {
    // https seulement ; le bouclage local (essais sur l'émulateur par `adb reverse`) est le seul http toléré
    val local = url.startsWith("http://localhost:") || url.startsWith("http://127.0.0.1:")
    if (!url.startsWith("https://") && !local) throw CodedException("BAD_URL", "Seules les adresses https sont acceptées", null)
    val directory = File(context.cacheDir, "updates").apply { mkdirs() }
    val target = File(directory, "update.apk")
    target.delete()

    val connection = URL(url).openConnection() as HttpURLConnection
    connection.connectTimeout = 15_000
    connection.readTimeout = 30_000
    connection.instanceFollowRedirects = true
    try {
      if (connection.responseCode !in 200..299) {
        throw CodedException("HTTP_${connection.responseCode}", "Le serveur a répondu ${connection.responseCode}", null)
      }
      val total = connection.contentLengthLong
      val stream = Sha256Stream()
      var downloaded = 0L
      var lastEvent = 0L
      connection.inputStream.use { input ->
        target.outputStream().use { output ->
          val buffer = ByteArray(64 * 1024)
          while (true) {
            val read = input.read(buffer)
            if (read < 0) break
            output.write(buffer, 0, read)
            stream.update(buffer, read)
            downloaded += read
            val now = System.currentTimeMillis()
            if (now - lastEvent > 250) {
              lastEvent = now
              sendEvent("onProgress", mapOf("downloaded" to downloaded, "total" to total))
            }
          }
        }
      }
      sendEvent("onProgress", mapOf("downloaded" to downloaded, "total" to total))
      if (!sameDigest(expectedSha256, stream.hex())) {
        target.delete()
        throw CodedException("SHA_MISMATCH", "L'empreinte du fichier téléchargé ne correspond pas", null)
      }
      return target.absolutePath
    } finally {
      connection.disconnect()
    }
  }

  private fun install(apk: File, promise: Promise) {
    if (!apk.exists()) throw CodedException("NO_FILE", "Fichier de mise à jour introuvable", null)
    val appContext = context
    val action = "${appContext.packageName}.UPDATE_STATUS"
    var settled = false
    fun settle(block: () -> Unit) {
      if (settled) return
      settled = true
      unregister()
      block()
    }

    unregister()
    val statusReceiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context, intent: Intent) {
        when (val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)) {
          PackageInstaller.STATUS_PENDING_USER_ACTION -> {
            // Android demande une confirmation (première installation, ou système qui ne l'évite pas)
            val confirm = if (Build.VERSION.SDK_INT >= 33) {
              intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
            } else {
              @Suppress("DEPRECATION") intent.getParcelableExtra(Intent.EXTRA_INTENT)
            }
            confirm?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)?.let { ctx.startActivity(it) }
            settle { promise.resolve("user-action") }
          }
          PackageInstaller.STATUS_SUCCESS -> settle { promise.resolve("installed") }
          else -> {
            val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: "Échec de l'installation ($status)"
            settle { promise.reject(CodedException("INSTALL_STATUS_$status", message, null)) }
          }
        }
      }
    }
    receiver = statusReceiver
    val filter = IntentFilter(action)
    if (Build.VERSION.SDK_INT >= 33) {
      appContext.registerReceiver(statusReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag") appContext.registerReceiver(statusReceiver, filter)
    }

    val installer = appContext.packageManager.packageInstaller
    val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
    // Installation sans confirmation seulement si Android la permet vraiment : l'app doit être elle-même
    // l'installateur d'origine (Android 12+). Sinon (APK posé depuis un navigateur, ADB…), le système avorte
    // la session avec « INSTALL_FAILED_ABORTED: permission denied » : on laisse alors Android afficher sa confirmation.
    if (Build.VERSION.SDK_INT >= 31 && installedBySelf(appContext)) {
      params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
    }
    val sessionId = installer.createSession(params)
    installer.openSession(sessionId).use { session ->
      apk.inputStream().use { input ->
        session.openWrite("update.apk", 0, apk.length()).use { output ->
          input.copyTo(output)
          session.fsync(output)
        }
      }
      // PendingIntent mutable : le système y ajoute le statut et, si besoin, l'écran de confirmation
      val intent = Intent(action).setPackage(appContext.packageName)
      val pending = PendingIntent.getBroadcast(
        appContext,
        sessionId,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
      )
      session.commit(pending.intentSender)
    }
  }

  private fun installedBySelf(ctx: Context): Boolean {
    return try {
      val installer = if (Build.VERSION.SDK_INT >= 30) {
        ctx.packageManager.getInstallSourceInfo(ctx.packageName).installingPackageName
      } else {
        @Suppress("DEPRECATION") ctx.packageManager.getInstallerPackageName(ctx.packageName)
      }
      installer == ctx.packageName
    } catch (_: Exception) {
      false
    }
  }

  private fun unregister() {
    val current = receiver ?: return
    receiver = null
    try {
      appContext.reactContext?.unregisterReceiver(current)
    } catch (_: IllegalArgumentException) {
      // déjà retiré
    }
  }
}
