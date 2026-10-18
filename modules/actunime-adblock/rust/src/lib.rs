//! Pont JNI entre la WebView Android et le moteur de filtres de Brave (`adblock`).
//!
//! Le moteur est un singleton chargé une fois (listes de filtres ou cache sérialisé) puis interrogé
//! depuis plusieurs threads par `shouldInterceptRequest`.

use std::sync::RwLock;

use adblock::lists::{FilterSet, ParseOptions};
use adblock::request::Request;
use adblock::Engine;
use jni::objects::{JClass, JObjectArray, JString};
use jni::sys::{jboolean, jbyteArray, jstring, JNI_FALSE, JNI_TRUE};
use jni::JNIEnv;
use serde::Serialize;

static ENGINE: RwLock<Option<Engine>> = RwLock::new(None);

/// Ressources à appliquer sur une page : sélecteurs à masquer et scriptlets à injecter.
#[derive(Serialize)]
struct Cosmetic {
    hide: Vec<String>,
    script: String,
}

pub fn build_engine(lists: &[String]) -> Engine {
    let mut set = FilterSet::new(false);
    for list in lists {
        set.add_filter_list(list.clone(), ParseOptions::default());
    }
    Engine::new_with_filter_set(set)
}

pub fn should_block(engine: &Engine, url: &str, source_url: &str, request_type: &str) -> bool {
    match Request::new(url, source_url, request_type, "") {
        Ok(request) => engine.check_network_request(&request).should_block(),
        // Une URL que le moteur ne sait pas lire (schéma `data:`, `blob:`…) n'est jamais bloquée.
        Err(_) => false,
    }
}

fn cosmetic(engine: &Engine, url: &str) -> Cosmetic {
    let resources = engine.url_cosmetic_resources(url);
    let mut hide: Vec<String> = resources.hide_selectors.into_iter().collect();
    hide.sort();
    Cosmetic { hide, script: resources.injected_script }
}

fn read_string(env: &mut JNIEnv, value: &JString) -> Option<String> {
    env.get_string(value).ok().map(|s| s.into())
}

/// `AdblockNative.load(lists: Array<String>): Boolean` — remplace le moteur par un moteur construit
/// depuis le texte des listes.
#[no_mangle]
pub extern "system" fn Java_expo_modules_actunimeadblock_AdblockNative_load(
    mut env: JNIEnv,
    _class: JClass,
    lists: JObjectArray,
) -> jboolean {
    let Ok(count) = env.get_array_length(&lists) else { return JNI_FALSE };
    let mut texts = Vec::with_capacity(count as usize);
    for index in 0..count {
        let Ok(item) = env.get_object_array_element(&lists, index) else { return JNI_FALSE };
        let Some(text) = read_string(&mut env, &JString::from(item)) else { return JNI_FALSE };
        texts.push(text);
    }
    let engine = build_engine(&texts);
    match ENGINE.write() {
        Ok(mut guard) => {
            *guard = Some(engine);
            JNI_TRUE
        }
        Err(_) => JNI_FALSE,
    }
}

/// `AdblockNative.loadSerialized(data: ByteArray): Boolean` — recharge un moteur sérialisé par `serialize`.
#[no_mangle]
pub extern "system" fn Java_expo_modules_actunimeadblock_AdblockNative_loadSerialized(
    env: JNIEnv,
    _class: JClass,
    data: jni::objects::JByteArray,
) -> jboolean {
    let Ok(bytes) = env.convert_byte_array(&data) else { return JNI_FALSE };
    let mut engine = Engine::default();
    if engine.deserialize(&bytes).is_err() {
        return JNI_FALSE;
    }
    match ENGINE.write() {
        Ok(mut guard) => {
            *guard = Some(engine);
            JNI_TRUE
        }
        Err(_) => JNI_FALSE,
    }
}

/// `AdblockNative.serialize(): ByteArray?` — moteur courant sérialisé, pour éviter de le reconstruire au démarrage.
#[no_mangle]
pub extern "system" fn Java_expo_modules_actunimeadblock_AdblockNative_serialize(
    env: JNIEnv,
    _class: JClass,
) -> jbyteArray {
    let Ok(guard) = ENGINE.read() else { return std::ptr::null_mut() };
    match guard.as_ref() {
        Some(engine) => env
            .byte_array_from_slice(&engine.serialize())
            .map(|array| array.into_raw())
            .unwrap_or(std::ptr::null_mut()),
        None => std::ptr::null_mut(),
    }
}

/// `AdblockNative.shouldBlock(url, sourceUrl, requestType): Boolean`
#[no_mangle]
pub extern "system" fn Java_expo_modules_actunimeadblock_AdblockNative_shouldBlock(
    mut env: JNIEnv,
    _class: JClass,
    url: JString,
    source_url: JString,
    request_type: JString,
) -> jboolean {
    let (Some(url), Some(source), Some(kind)) = (
        read_string(&mut env, &url),
        read_string(&mut env, &source_url),
        read_string(&mut env, &request_type),
    ) else {
        return JNI_FALSE;
    };
    let Ok(guard) = ENGINE.read() else { return JNI_FALSE };
    match guard.as_ref() {
        Some(engine) if should_block(engine, &url, &source, &kind) => JNI_TRUE,
        _ => JNI_FALSE,
    }
}

/// `AdblockNative.cosmetic(url): String?` — JSON `{ "hide": [...], "script": "..." }` pour la page.
#[no_mangle]
pub extern "system" fn Java_expo_modules_actunimeadblock_AdblockNative_cosmetic(
    mut env: JNIEnv,
    _class: JClass,
    url: JString,
) -> jstring {
    let Some(url) = read_string(&mut env, &url) else { return std::ptr::null_mut() };
    let Ok(guard) = ENGINE.read() else { return std::ptr::null_mut() };
    let Some(engine) = guard.as_ref() else { return std::ptr::null_mut() };
    let json = serde_json::to_string(&cosmetic(engine, &url)).unwrap_or_default();
    env.new_string(json).map(|s| s.into_raw()).unwrap_or(std::ptr::null_mut())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn engine() -> Engine {
        build_engine(&[
            "||ads.example.net^\n||tracker.example.org^$third-party\n@@||ads.example.net/allowed.js\n".to_string(),
            "example.com##.banner-ad\n".to_string(),
        ])
    }

    #[test]
    fn blocks_listed_domains_and_honours_exceptions() {
        let e = engine();
        assert!(should_block(&e, "https://ads.example.net/ad.js", "https://site.com/", "script"));
        assert!(!should_block(&e, "https://ads.example.net/allowed.js", "https://site.com/", "script"));
        assert!(!should_block(&e, "https://site.com/app.js", "https://site.com/", "script"));
    }

    #[test]
    fn third_party_option_depends_on_the_page() {
        let e = engine();
        assert!(should_block(&e, "https://tracker.example.org/p.gif", "https://site.com/", "image"));
        assert!(!should_block(&e, "https://tracker.example.org/p.gif", "https://tracker.example.org/", "image"));
    }

    #[test]
    fn ignores_urls_the_engine_cannot_parse() {
        assert!(!should_block(&engine(), "data:image/png;base64,AAAA", "https://site.com/", "image"));
    }

    #[test]
    fn returns_cosmetic_selectors_for_the_page_domain() {
        let c = cosmetic(&engine(), "https://example.com/page");
        assert!(c.hide.iter().any(|s| s == ".banner-ad"));
        assert!(cosmetic(&engine(), "https://other.org/").hide.is_empty());
    }

    #[test]
    fn serialized_engine_blocks_like_the_original() {
        let bytes = engine().serialize();
        let mut restored = Engine::default();
        restored.deserialize(&bytes).unwrap();
        assert!(should_block(&restored, "https://ads.example.net/ad.js", "https://site.com/", "script"));
    }
}
