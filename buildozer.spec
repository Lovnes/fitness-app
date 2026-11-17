[app]
title = FitTrack
package.name = fittrack
package.domain = org.example
source.dir = .
source.include_exts = py,png,jpg,kv,json
source.exclude_dirs = tests,docs,tools,bin,.buildozer,.github
version = 1.0.0
requirements = python3,kivy==2.3.0
orientation = portrait
fullscreen = 0
android.api = 34
android.minapi = 24
android.archs = arm64-v8a, armeabi-v7a
android.accept_sdk_license = True
android.ndk = 25b

# Pin python-for-android to a release whose Python (3.11) matches Kivy 2.3.0
# and Cython 0.29. The default "master" branch now builds Python 3.14, which
# Kivy 2.3.0's generated C code does not compile against.
p4a.branch = v2024.01.21

[buildozer]
log_level = 2
warn_on_root = 1
