# 🏎️ Neon Void Racer - Project Implementation Plan

## 1. Project Overview
**Concept:** A high-speed, infinite arcade racer where the player pilots a futuristic ship through a neon trench/void.
**Core Hook:** The phone is the flight stick. You tilt the phone physically to steer the ship on the PC screen.
**Aesthetic Goal:** "Premium," high-contrast neon (Synthwave/Cyberpunk), glowing particles, glassmorphism UI. "Wow" factor is critical.

---

## 2. Technical Learnings (Critical Context from Previous Project)
*These learnings must be applied to avoid repeat issues:*

### 📡 Connectivity (WebRTC)
*   **Library:** Use `PeerJS` for WebRTC handling.
*   **Flow:** PC acts as "Host" (HostID), Phone acts as "Client".
*   **Room Codes:** Use short 4-char codes (e.g., `NEON-X92Z`).
*   **QR Codes:** Use `qrcodejs` (browser-native lib) inside a `div`, NOT the Node.js `qrcode` lib.
*   **URL Structure:** Pass room IDs via **URL Hash** (`#ROOMID`), not query parameters (more reliable for QR scanners).

### 📱 Sensor Access (The "HTTPS" Rule)
*   **Requirement:** Gravity/Motion sensors **REQUIRE HTTPS** on modern iOS/Android.
*   **Deployment:** Must deploy to **GitHub Pages** (or similar) to test sensors. Localhost only works on the PC, not the phone.
*   **Permissions:**
    *   **iOS 13+:** Requires explicit user gesture (button click) -> `DeviceMotionEvent.requestPermission()`.
    *   **Android:** Try `Permissions API` ('accelerometer') first, fallback to standard `devicemotion` listener.
*   **Data Reliability:**
    *   **Tilt/Gravity** (`accelerationIncludingGravity`) is **highly reliable** and smooth.
    *   **Motion/Shock** (Shake) is less reliable/noisy.
    *   **Compass** (Orientation) requires calibration and drifts. **Avoid if possible.**

---

## 3. Control Scheme Specs
**Philosophy:** "Steer, don't shake." Continuous data stream for immersion.

### Phone -> PC Data Packet
Send at ~30-60Hz (throttled):
```json
{
  "type": "control",
  "tiltX": 5.2,  // X-axis gravity (-9.8 to 9.8). Used for Steering.
  "tiltY": 1.1,  // Y-axis gravity. Used for Speed/Pitch (optional).
  "isBoosting": false, // Screen touch active
  "disconnect": false
}
```

### PC -> Phone Feedback
```json
{
  "type": "feedback",
  "event": "impact", // Triggers navigator.vibrate(200)
  "health": 80,      // Updates dashboard UI
  "score": 1500
}
```

---

## 4. Architecture & File Structure

### Folder: `neonRacer/`
*   `index.html` (PC Game Host)
    *   Canvas for Game.
    *   Hidden Connection Panel (Glassmorphism overlay).
*   `controller.html` (Phone Client)
    *   Virtual Dashboard UI (Steering visualizer, Boost button).
*   `game.js` (Core Logic)
    *   Physics engine (Custom or light library).
    *   PeerJS Host logic.
*   `controller.js` (Phone Logic)
    *   Sensor handling + Permission flows.
    *   PeerJS Client logic.
*   `styles.css`
    *   CSS Variables for Neon Palette (`--neon-blue`, `--neon-pink`).

---

## 5. Development Workflow for the Agent
1.  **Scaffold:** Create the folder structure and `index.html` with the "Host" architecture (reusing the `rtcGame` connection logic).
2.  **Controller First:** Build `controller.html` to visualize the specific **Tilt X** data. Verify smoothing/lerping math (raw sensor data is jittery; apply simple low-pass filter: `smoothed = current * 0.1 + last * 0.9`).
3.  **Engine:** Build the basic "Tunnel" visual on PC Canvas. Mapped `tiltX` to player X position.
4.  **Polish:** Add "banking" animation (ship rotates as it moves). Add particle trails.
5.  **Deploy:** Push to GitHub Pages immediately to test controls.

---

## 6. Design Preferences
*   **Colors:** Deep blacks/purples backgrounds. Bright Cyan (`#00f3ff`) and Magenta (`#ff00ff`) accents.
*   **UI:** No default browser alerts. Custom HTML overlays.
*   **Feedback:** Visual + Audio + Haptic (Vibration).

---

## 7. 🚀 Initial Prompt (Copy & Paste to start next session)
*Use this prompt to ensure the new AI Agent has all the contest and context:*

> "I want to start a new project called 'Neon Void Racer' based on the blueprint in `NEON_RACER_PLAN.md`.
>
> Please initialize the `neonRacer` folder structure. Copy the PeerJS connection logic, QRCode generation, and CSS variables from `rtcGame` as a base, but strip out the Dino gameplay code.
>
> First goal: Create a `controller.html` that successfully visualizes the phone's X-axis Tilt (Gravity) in real-time. Do not proceed to the game engine until we confirm the 'Steering' data is being read and transmitted correctly over WebRTC."
