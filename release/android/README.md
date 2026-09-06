# Android release

This directory contains the signed Android artifacts generated for the production PWA at `https://wms-repuestos.up.railway.app`.

- `WMS-Repuestos.apk`: directly installable Android package.
- `WMS-Repuestos.aab`: Android App Bundle for Google Play.
- Package ID: `app.railway.up.wms_repuestos.twa`.
- Version: `1.0.0` (`versionCode` 1).

The signing keystore and its credentials are deliberately excluded from Git. They are stored locally under `.private/android-signing/`. Preserve that directory securely: the same key is required to publish future updates.

The matching Digital Asset Links declaration is published from `public/.well-known/assetlinks.json`.
