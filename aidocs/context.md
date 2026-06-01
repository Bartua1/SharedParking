# Project Context: SharedParking

## Overview
**SharedParking** is a cross-platform mobile application built with Capacitor, designed to solve a common problem: **tracking and sharing the parking location of shared vehicles or objects**. 

In families, co-living situations, or small business teams, multiple people often share a single car (or other mobile assets). Keeping track of who parked the car and where can be a hassle involving constant messaging. SharedParking automates this tracking. By detecting when a user's phone disconnects from a registered Bluetooth LE device (typically the car's hands-free system or a Bluetooth beacon), the app automatically grabs the user's current GPS location and updates it in a shared Supabase database. All members of the group can then view the vehicle's real-time location on a map.

---

## Core Features

### 1. Supabase Authentication
* **Seamless Sign-in & Sign-up:** Secure authentication powered by Supabase Auth (Email/Password or OAuth).
* **User Profiles:** Each user sets up a profile with:
  * **Username:** Unique, user-facing display name.
  * **Profile Picture:** Stored securely in a Supabase Storage bucket, visible to other group members.

### 2. Group Management
* **Shared Spaces:** Users can create or join groups (e.g., "Family Car", "Office Fleet", "Adventure Gear").
* **Collaborative Tracking:** Any group member can view the status and location of all vehicles/objects assigned to that group.
* **Member Invites:** Generate invite links or codes to bring other users into the group.

### 3. Tracked Objects (Vehicles & Assets)
* **Custom Assets:** Create objects within a group (predominantly cars, but expandable to bikes, scooters, keys, etc.).
* **Aesthetics & Personalization:** Each object features:
  * **Name:** (e.g., "Blue Sedan", "Utility Van").
  * **Icon:** Selection of custom SVG icons or high-fidelity emojis (e.g., 🚗, 🚙, 🚐, 🏍️).
  * **Last Known Location:** Marked with latitude/longitude coordinates, a timestamp, and the profile of the user who parked it.
  * **Associated BLE Mac Address/UUID:** The unique identifier of the Bluetooth device used to track the object's parking event.

### 4. Automated Bluetooth LE Disconnect Tracking
* **Silent Background Monitoring:** The app runs a background service utilizing `@capacitor-community/bluetooth-le`.
* **Automatic Disconnect Trigger:**
  1. The user gets into the car; the phone connects to the car's Bluetooth LE system.
  2. The user drives, reaches their destination, and parks.
  3. The car is turned off, causing the Bluetooth system to power down and disconnect.
  4. The app intercepts the disconnect event.
  5. The app immediately wakes up (using background tasks if needed) and requests the current device coordinates via `@capacitor/geolocation`.
  6. The app sends a secure POST request to the Supabase backend to update the vehicle's last known location.

### 5. Multilingual Support (i18n)
* **Spanish & English Support:** Full localization covering all views, buttons, alerts, and placeholders.
* **Instant Toggle switcher:** A settings switcher inside the navigation drawer allows users to toggle languages seamlessly, automatically saving user preferences in `localStorage` for future sessions.

---

## User Journeys

### User Journey A: Setting Up the App
1. **Sign Up:** A user downloads the app, creates an account, chooses a username, and uploads a profile picture.
2. **Create Group:** They create a new group named "Family Fleet".
3. **Register Vehicle:** They add a vehicle, named "Dad's SUV", choosing a custom SUV emoji (🚙).
4. **Link Bluetooth:** They pair the app with the SUV's built-in Bluetooth audio system or beacon by selecting it from a list of scanned Bluetooth LE devices inside the app.
5. **Invite Family:** The creator generates an invite code and sends it to their spouse and children, who join the "Family Fleet" group.

### User Journey B: Seamless Parking Tracking
1. **Driving:** The spouse drives the SUV. The app is running in the background and automatically establishes a passive connection to the SUV's paired Bluetooth LE device.
2. **Parking:** The spouse arrives at the grocery store, turns off the ignition, and walks away.
3. **Disconnect Detection:** As the SUV power cuts or the spouse walks out of range, the Bluetooth LE connection is severed.
4. **Location Capture:** The SharedParking background process detects the disconnection, queries the GPS, and retrieves coordinates: `[40.7128, -74.0060]`.
5. **Database Update:** The app issues an update request to Supabase, logging the coordinates, timestamp, and identifying the spouse as the parker.
6. **Location Retrieval:** Later, the child needs to use the SUV. They open SharedParking, see "Dad's SUV" on the map located at the grocery store, and see the spouse's profile picture showing who parked it.
