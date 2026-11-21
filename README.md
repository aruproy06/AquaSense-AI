# AquaSense AI — Intelligent Water Quality Monitoring

Final year project · drinking-water quality monitoring with ESP32 sensors, cloud ingestion,
machine-learning contamination detection and a real-time bento dashboard.

> The system uses sensors to measure important water parameters — pH, turbidity, temperature and
> electrical conductivity (EC/TDS). An ESP32 microcontroller collects these readings and transmits
> them to a cloud database. The collected data is analyzed using machine-learning algorithms to
> identify abnormal patterns, detect possible contamination events and estimate future
> water-quality trends. Users monitor real-time readings through a web dashboard and receive alerts
> whenever unusual water conditions are detected.

---

## 1. What is implemented

| Area | Detail |
| --- | --- |
| Authentication | Sign up → email OTP → sign in, Google sign-in, password reset, TOTP MFA (`/mfa`), password-strength meter, server-side lockout after 5 failed attempts in 15 minutes |
| Dashboard | Live condition hero (status, purity %, ML risk, sparkline), ESP32 status dock, four parameter gauges with safe-band overlay, ML forecast panel, anomaly/alert log, project context |
| Data ingest | Drag-and-drop `.xlsx / .xls / .csv` import (validated, parsed server-side), plus a signed HTTPS webhook for the ESP32 |
| Analysis | Threshold grading against BIS IS 10500 / WHO, z-score anomaly detection, contamination risk score, damped-regression trend forecast with confidence band |
| Alerts | Per-parameter alerts with severity + lifecycle (open → acknowledged → resolved), in-app feed, alert history page, email notification |
| Devices | Registration with one-time API key, key rotation, online/offline + battery/signal/last-transmission |
| Security | Row-level security on every entity, HMAC-signed device webhook, rate limits, upload hardening, redacted audit log, CSP |
| Docs in-app | `/security` shows the 20-point hardening checklist mapped to where each control lives |

## 2. Architecture

The application runs on the Base44 edge runtime (TanStack Start: server functions + server routes,
Cloudflare Workers). The reference architecture from the brief maps onto it directly:

| Brief | This codebase |
| --- | --- |
| React/Next frontend + Tailwind | React 19 + TanStack Router + Tailwind (bento design system) |
| Node/Express or FastAPI backend | Server functions in `src/lib/server-fns.js` and the server route `src/routes/api/ingest.js` |
| PostgreSQL with RLS | Platform entity store with per-entity `rls` rules (owner-or-admin; audit log admin-only) |
| Python ML service | `runMlAnalysis` server function + the pure model code in `src/lib/water.js` (shared by client and server) |
| ESP32 → cloud ingestion | `POST /api/ingest` with device API key + HMAC-SHA256 signature |

```
ESP32 ──HTTPS + HMAC──▶ /api/ingest ──▶ WaterReading ──▶ ML analysis ──▶ Dashboard
Lab tests / datasets ──upload──▶ server parsing ──▶ WaterReading ──▶ Alerts ──▶ Email
```

### Data model

| Entity | Purpose | Access |
| --- | --- | --- |
| `WaterReading` | pH, turbidity, temperature, EC, TDS, status, anomaly flags, timestamp | owner or admin |
| `Device` | ESP32 identity, location, status, battery, signal, hashed API key | owner or admin |
| `Upload` | File name, private URI, row counts, outcome | owner or admin |
| `Alert` | Parameter, value, severity, message, lifecycle, email state | owner or admin |
| `AuditLog` | Action, redacted detail, outcome, hashed IP/subject | admin only |

## 3. Running it

The app is hosted by Base44 — open the preview to use it. There is no separate build step to
configure, and the database schema lives in `base44/entities/*.jsonc`.

Local development (same stack the platform runs):

```bash
npm install
npm run dev      # dev server
npm run build    # production build
```

### Environment template

Copy `.env.example` and fill it in for a self-hosted deployment. On Base44 these values are
injected by the platform; no secret is ever shipped to the browser.

## 4. Device ingestion API

```
POST /api/ingest
x-device-id:          AQ-ESP32-XXXXXX
x-device-key:         <device API key, issued once in the dashboard>
x-aquasense-signature: hex(HMAC-SHA256(raw_body, device_api_key))
content-type:         application/json

{
  "device_id": "AQ-ESP32-XXXXXX",
  "ph": 7.18,
  "turbidity": 1.4,
  "temperature": 24.1,
  "ec": 536,
  "tds": 268,
  "battery": 92,
  "signal": -61,
  "recorded_at": "2026-11-21T06:30:00Z"
}
```

Responses: `202` accepted (with the graded status and alert count), `401` bad key/signature,
`422` invalid payload, `429` rate limited, `413` body over 16 KB.

Minimal device sketch (MicroPython):

```python
import urequests, ujson, hmac, hashlib

body = ujson.dumps({ "device_id": DEVICE_ID, "ph": ph, "turbidity": ntu,
                     "temperature": temp, "tds": tds })
sig = hmac.new(API_KEY.encode(), body.encode(), hashlib.sha256).hexdigest()
urequests.post("https://<your-app-domain>/api/ingest", data=body,
               headers={ "Content-Type": "application/json",
                         "x-device-id": DEVICE_ID,
                         "x-device-key": API_KEY,
                         "x-aquasense-signature": sig })
```

## 5. Machine learning

`src/lib/water.js` holds the model layer so the same maths runs in the browser and on the server:

* **Grading** — each parameter is compared with its acceptable band; more than 25 % of the band
  beyond a limit is classed as contamination rather than a warning.
* **Purity score** — weighted distance from the ideal operating band, 0–100 %.
* **Contamination risk** — normalised excursion beyond the safe envelope, 0–99.9 %.
* **Anomaly detection** — z-score of the latest readings against the trailing 24-reading baseline
  (threshold 2.5σ).
* **Forecast** — ordinary least squares trend, damped toward the recent mean, with a widening 80 %
  confidence band over the next 12 intervals (ARIMA/LSTM-style projection visualisation without a
  heavyweight runtime).

Swap the forecast function for a hosted ARIMA/LSTM endpoint and the dashboard keeps working — the
response shape is `{ recorded_at, value, lower, upper }`.

## 6. Security hardening checklist

| # | Requirement | Where it is implemented |
| --- | --- | --- |
| 1 | SQL injection | All access through the typed entity layer; schemas validated before every query |
| 2 | XSS | React escaping, no raw HTML injection, CSP + nosniff + referrer policy in `src/routes/__root.jsx` |
| 3 | CSRF | Cookie session with SameSite from the platform auth layer; all writes behind authenticated server functions |
| 4 | File upload validation | `src/lib/upload-guard.js` (extension, MIME, size, magic bytes, CSV threat scan, name sanitising) + server re-validation and private storage in `importReadings` |
| 5 | IDOR | Owner-or-admin RLS on every entity; `get()`/`update()` scoped by those rules in server functions |
| 6 | Rate limiting | `src/lib/rate-limit.server.js` used by sign-in, uploads, device registration, ML analysis and `/api/ingest` |
| 7 | Token secrets | Platform-managed token issuance/rotation; no signing secret in this repo |
| 8 | Server-side secrets | All privileged calls run in server functions; the client only receives results |
| 9 | Password hashing | Platform identity service (salted hashes); the app never handles passwords |
| 10 | MFA | TOTP + SMS via the platform MFA screens (`/mfa`) |
| 11 | CORS | Same-origin app; `/api/ingest` sends no wildcard CORS headers |
| 12 | No tokens in localStorage | httpOnly/Secure/SameSite cookie session; no token persisted by app code |
| 13 | Server-side permissions | `requireUser` middleware on every privileged server function; ownership re-checked in the handler |
| 14 | Row-level security | `rls` blocks in all five entity schemas |
| 15 | Webhook signatures | HMAC-SHA256 + SHA-256 key hash comparison in constant time (`/api/ingest`) |
| 16 | SSRF | Only signed URLs for files this app stored are fetched; no user-supplied outbound URL |
| 17 | Source maps | No browser source maps shipped |
| 18 | Default credentials | No seeded accounts or default passwords |
| 19 | Log hygiene | `redact()` + structured logging in `src/lib/audit.server.js`; IPs stored as SHA-256 |
| 20 | Dependency hygiene | Pinned dependencies in `package-lock.json`, platform security scan |

## 7. Notes and limits

* Live telemetry is polling-based (15 s dashboard refresh) rather than a persistent socket; the
  ESP32 pushes into the same store, so the dashboard picks the reading up on the next poll.
* Email alerts go to the signed-in user's registered address (the platform can only reliably reach
  registered app users).
* Thresholds are drinking-water acceptance limits; adjust `PARAMS` in `src/lib/water.js` for a
  different source (irrigation, aquaculture, effluent).
