package expo.modules.actunimeupdater

import android.content.Context
import android.os.Build
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Version installée de l'app, comparée à celle de la dernière release GitHub. Le module ne télécharge ni
 * n'installe rien : le membre télécharge l'APK sur la page de la release, donc l'app ne demande aucune autorisation
 * « installer des applications ».
 */
class ActunimeUpdaterModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw CodedException("NO_CONTEXT", "Contexte Android indisponible", null)

  override fun definition() = ModuleDefinition {
    Name("ActunimeUpdater")

    /** Version installée : `versionCode` (comparé à celui de la fiche de version) et nom lisible. */
    Function("getInstalled") {
      val info = context.packageManager.getPackageInfo(context.packageName, 0)
      val code = if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else @Suppress("DEPRECATION") info.versionCode.toLong()
      mapOf("versionCode" to code, "versionName" to (info.versionName ?: ""))
    }
  }
}
