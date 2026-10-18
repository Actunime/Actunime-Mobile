package expo.modules.actunimeadblock

/** Moteur de filtres de Brave (`adblock-rust`), compilé dans `libactunime_adblock.so` (cf. `rust/`). */
object AdblockNative {
  init {
    System.loadLibrary("actunime_adblock")
  }

  /** Remplace le moteur par un moteur construit depuis le texte des listes de filtres. */
  @JvmStatic external fun load(lists: Array<String>): Boolean

  /** Recharge un moteur produit par [serialize] (démarrage rapide, sans reparser les listes). */
  @JvmStatic external fun loadSerialized(data: ByteArray): Boolean

  @JvmStatic external fun serialize(): ByteArray?

  /** `requestType` : document, subdocument, script, stylesheet, image, font, media, xhr, other. */
  @JvmStatic external fun shouldBlock(url: String, sourceUrl: String, requestType: String): Boolean

  /** JSON `{ "hide": [sélecteurs], "script": "…" }` à appliquer sur la page, ou null. */
  @JvmStatic external fun cosmetic(url: String): String?
}
