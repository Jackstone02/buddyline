# Buddyline — Image Asset Specifications

Spec sheet for the designer/client. All app build assets are **PNG**. Provide a **vector master
(SVG/AI)** too so any size can be re-exported cleanly. Use the Buddyline diver-on-line mark and
the brand blue from the logo.

> Tip: a single **1024×1024 master** of (a) the full logo and (b) the icon-only mark covers most
> of these via export.

---

## 1. Required app assets (used by the build — `app.json`)

| Asset | File (in `assets/`) | Size | Format | Transparency | Notes |
|---|---|---|---|---|---|
| **App icon** | `icon.png` | **1024×1024** | PNG | ❌ **No alpha** (opaque) | **Square.** No rounded corners (the OS adds them). Used for iOS + as the base icon. |
| **Android adaptive — foreground** | `android-icon-foreground.png` | **1024×1024** | PNG | ✅ **Yes (transparent)** | Keep the logo inside the **center ~66% safe zone (~672×672)** — Android crops the edges into circle/squircle shapes. |
| **Android adaptive — background** | `android-icon-background.png` | **1024×1024** | PNG | ❌ opaque | Can be a solid brand-blue fill. |
| **Android adaptive — monochrome** | `android-icon-monochrome.png` | **1024×1024** | PNG | ✅ transparent | **All-white silhouette** of the mark on transparent (Android 13+ themed icons). |
| **Splash logo** | `splash-icon.png` | **~1024×1024** | PNG | ✅ transparent | Logo centered; shows on a background color (currently white). Transparent bg so it sits cleanly. |
| **Notification icon (Android)** | `notification-icon.png` | **96×96** | PNG | ✅ transparent | **Pure white** silhouette on transparent (Android renders it as a single-color status-bar glyph). |
| **Web favicon** | `favicon.png` | **48×48** (or 196×196) | PNG | optional | Small square. |

### Current brand colors in use (adjust as desired)
- Splash background: `#FFFFFF` (white)
- Android adaptive background: `#E6F4FE` (light blue)
- Notification accent: `#1CA7A6` (teal)
- Primary brand blue: from the logo (please confirm exact hex)

---

## 2. App Store / Play Store listing assets (needed to publish)

| Asset | Size | Format | Notes |
|---|---|---|---|
| **iOS App Store icon** | 1024×1024 | PNG, no alpha | Same as app icon. |
| **Google Play app icon** | 512×512 | 32-bit PNG (alpha ok) | |
| **Google Play feature graphic** | 1024×500 | PNG/JPG | Banner on the store listing. |
| **iOS screenshots** | 6.7" (1290×2796) & 6.5" (1242×2688) | PNG/JPG | At least one set; more sizes optional. |
| **Android screenshots** | min 1080px on long edge (e.g. 1080×1920) | PNG/JPG | 2–8 images. |

---

## 3. Quick "send to client" summary
> Please export, as PNG (and provide the vector master):
> 1. **App icon** — 1024×1024, **square, no transparency**.
> 2. **Android adaptive foreground** — 1024×1024, **transparent**, logo within the centered 66% safe zone.
> 3. **Android adaptive background** — 1024×1024 solid brand-blue (or transparent if foreground is full).
> 4. **Android monochrome icon** — 1024×1024, white-on-transparent silhouette.
> 5. **Splash logo** — ~1024×1024, **transparent** background.
> 6. **Notification icon** — 96×96, **white-on-transparent** silhouette.
> 7. **Favicon** — 48×48.
> 8. **Store listing:** iOS 1024×1024 icon, Play 512×512 icon, Play feature graphic 1024×500, plus screenshots.
