#!/usr/bin/env bash
# Compile le moteur de filtres (Rust) en bibliothèques JNI pour Android.
# Prérequis : rustup + cibles aarch64-linux-android / x86_64-linux-android, cargo-ndk, ANDROID_NDK_HOME.
set -euo pipefail
cd "$(dirname "$0")/../modules/actunime-adblock/rust"
cargo ndk -t arm64-v8a -t x86_64 -o ../android/src/main/jniLibs build --release
