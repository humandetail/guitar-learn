#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != Darwin ]]; then
  echo "Native checks require macOS with the Apple command-line tools."
  exit 1
fi
task_build_dir=$(mktemp -d "${TMPDIR:-/tmp}/guitar-ios-check.XXXXXX")
task_module_cache="${GUITAR_SWIFT_MODULE_CACHE:-/tmp/guitar-swift-module-cache}"
trap 'rm -rf "$task_build_dir"' EXIT
plutil -lint ios/GuitarLearn.xcodeproj/project.pbxproj ios/GuitarLearn/Info.plist ios/GuitarLearn/Resources/PrivacyInfo.xcprivacy
swiftc -swift-version 5 -module-cache-path "$task_module_cache" \
  ios/GuitarLearn/Audio/AudioMath.swift ios/GuitarLearn/Audio/PitchBridge.swift ios/Tests/main.swift \
  -o "$task_build_dir/core-tests"
"$task_build_dir/core-tests" ios/GuitarLearn/Resources/PitchDetector.js
swiftc -swift-version 5 -module-cache-path "$task_module_cache" \
  ios/GuitarLearn/Audio/*.swift ios/Tests/LifecycleChecks.swift -o "$task_build_dir/lifecycle-tests"
"$task_build_dir/lifecycle-tests"
swiftc -swift-version 5 -typecheck -module-cache-path "$task_module_cache" \
  ios/GuitarLearn/Audio/*.swift ios/GuitarLearn/Views/*.swift ios/GuitarLearn/GuitarLearnApp.swift
if xcrun --sdk iphonesimulator --show-sdk-path >/dev/null 2>&1; then
  xcodebuild -project ios/GuitarLearn.xcodeproj -scheme GuitarLearn \
    -destination 'generic/platform=iOS Simulator' -derivedDataPath "$task_build_dir/DerivedData" \
    CODE_SIGNING_ALLOWED=NO build
else
  echo "PENDING: iOS SDK unavailable; macOS typecheck does not validate iOS-only code or an iPhone app build."
fi
