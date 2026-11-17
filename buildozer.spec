[app]
title = FitTrack
package.name = fittrack
package.domain = org.example
source.dir = .
source.include_exts = py,png,jpg,kv,json
source.exclude_dirs = tests,docs,tools,bin,.buildozer
version = 1.0.0
requirements = python3,kivy==2.3.0
orientation = portrait
fullscreen = 0
android.api = 34
android.minapi = 24
android.archs = arm64-v8a, armeabi-v7a

[buildozer]
log_level = 2
warn_on_root = 1
