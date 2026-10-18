package expo.modules.actunimeadblock

import com.reactnativecommunity.webview.RequestFilter
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class ActunimeAdblockModule : Module() {
  private var engine: AdblockEngine? = null

  override fun definition() = ModuleDefinition {
    Name("ActunimeAdblock")

    Events("onBlocked")

    OnCreate {
      val context = appContext.reactContext ?: return@OnCreate
      val adblock = AdblockEngine(File(context.filesDir, "adblock")) { page, count ->
        sendEvent("onBlocked", mapOf("url" to page, "count" to count))
      }
      engine = adblock
      RequestFilter.delegate = adblock
      adblock.start()
    }

    OnDestroy {
      RequestFilter.delegate = null
    }

    Function("setEnabled") { enabled: Boolean -> engine?.enabled = enabled }

    Function("getStatus") { mapOf("ready" to (engine?.ready == true), "enabled" to (engine?.enabled == true)) }

    Function("refreshLists") { engine?.refresh() }
  }
}
