# SharedParking 🚗📱

**SharedParking** is a cross-platform mobile application developed with CapacitorJS and Supabase. It automatically logs and shares the parking location of registered vehicles when a user disconnects from the vehicle's Bluetooth LE system.

## Key Features
* **Automated Parking Logs:** Detects vehicle Bluetooth LE system disconnection, queries current GPS location, and updates the shared backend automatically.
* **Supabase Integration:** Powered by Supabase Auth (emails, sessions), Supabase Database (PostgreSQL with RLS), and Supabase Storage (avatars).
* **Collaborative Groups:** Users can form groups (families, fleets) to share tracking of multiple objects.
* **Customizable Assets:** Objects (mostly cars) can have customizable names and representative emojis/icons.

---

## Repository Structure

```text
├── aidocs/
│   ├── context.md          # Details on features, usage, and user flows
│   └── architecture.md     # System architecture, schemas, and native settings
├── .gitignore              # Configured ignore targets for Node, Capacitor, iOS, and Android
└── README.md               # Main repository documentation (this file)
```

## Detailed Documentation

To dive deeper into the project design, please check out:
* [Application Context](aidocs/context.md) - Learn about core features, concepts, and user journeys.
* [System Architecture](aidocs/architecture.md) - Details the database DDL, RLS rules, Bluetooth background sequence diagrams, and iOS/Android build configurations.

---

## Core Technologies
* **Runtime Framework:** [CapacitorJS](https://capacitorjs.com/)
* **Backend BaaS:** [Supabase](https://supabase.com/)
* **Bluetooth Plugin:** [@capacitor-community/bluetooth-le](https://github.com/capacitor-community/bluetooth-le)
* **Geolocation Plugin:** [@capacitor/geolocation](https://capacitorjs.com/docs/apis/geolocation)

---

## Quick Setup Guide

### 1. Prerequisite Installations
* **Node.js:** Ensure Node LTS is installed.
* **Mobile SDKs:** Xcode (for iOS development on macOS) and Android Studio (for Android build targets).

### 2. Setup the Web Application
Initialize the packages (once package.json is created):
```bash
npm install
```

### 3. Add Native Platforms
Capacitor integrates platforms natively:
```bash
# Add platforms
npx cap add ios
npx cap add android

# Copy assets and sync plugins
npx cap sync
```

### 4. Database Setup
Execute the PostgreSQL DDL schema found in [App Architecture DDL](aidocs/architecture.md#postgresql-ddl-script) inside your Supabase SQL editor.
Make sure to configure the corresponding Row Level Security (RLS) policies to keep user data secure.
