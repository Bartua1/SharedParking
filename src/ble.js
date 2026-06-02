import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import { t } from './i18n';
import { haptics } from './haptics';

const SCAN_DURATION_MS = 5000;

// State
let activeTargetInput = null;
let activeTargetText = null;
let inMemoryPairedDevices = new Map(); // id -> name (to merge into saved list)
let modalInitialized = false;

// Return true if BLE client is available on native
function isBleAvailable() {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.isPluginAvailable('BluetoothLe')
  );
}

/**
 * Scan for BLE devices and return a list of discovered entries.
 */
async function scanForDevices() {
  await BleClient.initialize({ androidNeverForLocation: true });
  const found = new Map();

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(async () => {
      try {
        await BleClient.stopLEScan();
      } catch (_) {}
      resolve();
    }, SCAN_DURATION_MS);

    BleClient.requestLEScan(
      { allowDuplicates: false },
      (result) => {
        const id = result.device?.deviceId;
        const name = result.device?.name || result.localName || '';
        if (id && !found.has(id)) {
          found.set(id, { id, name });
        }
      }
    ).catch((err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  return Array.from(found.values());
}

/**
 * Registers active pairings so they show up under "Saved Devices" in the picker.
 * Called from ui.js whenever groups/vehicles list updates.
 */
export function registerPairedDevices(pairedDevicesMap) {
  if (!pairedDevicesMap) return;
  Object.values(pairedDevicesMap).forEach(devId => {
    if (devId && !inMemoryPairedDevices.has(devId)) {
      // Store with empty name; it will fall back to displaying its ID
      inMemoryPairedDevices.set(devId, { id: devId, name: '' });
    }
  });
}

/**
 * Persists a device to localStorage known list.
 */
export function saveBluetoothDevice(id, name = '') {
  if (!id) return;
  try {
    const local = localStorage.getItem('sp_saved_ble_devices');
    const list = local ? JSON.parse(local) : [];
    const existingIdx = list.findIndex(d => d.id === id);
    if (existingIdx > -1) {
      if (name) list[existingIdx].name = name;
    } else {
      list.push({ id, name });
    }
    localStorage.setItem('sp_saved_ble_devices', JSON.stringify(list));
  } catch (e) {
    console.error('Error saving BLE device to localStorage:', e);
  }
}

/**
 * Retrieves the compiled and deduped known/saved list.
 */
async function loadSavedDevices() {
  const map = new Map();

  // 1. In-memory pairings
  inMemoryPairedDevices.forEach(d => {
    map.set(d.id, { id: d.id, name: d.name || '' });
  });

  // 2. LocalStorage known devices
  try {
    const local = localStorage.getItem('sp_saved_ble_devices');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        parsed.forEach(d => {
          if (d.id) {
            const existing = map.get(d.id);
            map.set(d.id, { id: d.id, name: d.name || (existing ? existing.name : '') });
          }
        });
      }
    }
  } catch (_) {}

  // 3. Native Bonded and Connected devices
  if (isBleAvailable()) {
    try {
      await BleClient.initialize({ androidNeverForLocation: true });
      // Bonded (Android only)
      try {
        const bonded = await BleClient.getBondedDevices();
        if (Array.isArray(bonded)) {
          bonded.forEach(d => {
            const existing = map.get(d.deviceId);
            map.set(d.deviceId, { id: d.deviceId, name: d.name || (existing ? existing.name : '') });
          });
        }
      } catch (_) {}

      // Connected (All platforms)
      try {
        const connected = await BleClient.getConnectedDevices([]);
        if (Array.isArray(connected)) {
          connected.forEach(d => {
            const existing = map.get(d.deviceId);
            map.set(d.deviceId, { id: d.deviceId, name: d.name || (existing ? existing.name : '') });
          });
        }
      } catch (_) {}
    } catch (err) {
      console.warn('[BLE] Could not initialize for saved devices list:', err);
    }
  }

  // Fallback testing item if empty
  if (map.size === 0) {
    map.set('CAR_BLE_MOCK_DEV', { id: 'CAR_BLE_MOCK_DEV', name: 'Mock OBD-II Adapter' });
  }

  return Array.from(map.values());
}

/**
 * Dynamically updates the display text on the form trigger button.
 */
export function updateTriggerLabel(textEl, value) {
  if (!value) {
    textEl.textContent = t('ble_select_placeholder');
    textEl.classList.add('placeholder');
    return;
  }
  textEl.classList.remove('placeholder');

  // Look up name in localStorage or active pairings
  let name = '';
  const inMem = inMemoryPairedDevices.get(value);
  if (inMem && inMem.name) name = inMem.name;

  if (!name) {
    try {
      const local = localStorage.getItem('sp_saved_ble_devices');
      if (local) {
        const parsed = JSON.parse(local);
        const found = parsed.find(d => d.id === value);
        if (found && found.name) name = found.name;
      }
    } catch (_) {}
  }

  if (value === 'CAR_BLE_MOCK_DEV') {
    name = 'Mock OBD-II Adapter';
  }

  textEl.textContent = name ? `${name} (${value})` : value;
}

/**
 * Initializes a trigger button to open the BLE picker.
 */
export function initBleSelector({
  triggerBtnId,
  triggerTextId,
  inputId,
  currentValue = '',
}) {
  const triggerBtn = document.getElementById(triggerBtnId);
  const triggerText = document.getElementById(triggerTextId);
  const input = document.getElementById(inputId);

  if (!triggerBtn || !triggerText || !input) return;

  // Initialize input and trigger display text
  input.value = currentValue;
  updateTriggerLabel(triggerText, currentValue);

  // Bind click event to trigger picker modal
  triggerBtn.addEventListener('click', () => {
    haptics.impact('light');
    openBlePickerModal({
      targetInput: input,
      targetText: triggerText,
      currentValue: input.value
    });
  });

  // Ensure modal listeners are bound once globally
  setupBlePickerModalHandlers();
}

/**
 * Setup global picker modal click handlers once.
 */
function setupBlePickerModalHandlers() {
  if (modalInitialized) return;
  modalInitialized = true;

  const modal = document.getElementById('ble-picker-modal');
  const scanBtn = document.getElementById('ble-picker-scan-btn');

  if (!modal) return;

  // Scan button click
  if (scanBtn) {
    scanBtn.addEventListener('click', async () => {
      if (!isBleAvailable()) {
        // Fallback or warning
        haptics.notification('warning');
        alert(t('ble_scan_error'));
        return;
      }

      // Scan process UI
      scanBtn.classList.add('scanning');
      scanBtn.innerHTML = `<span class="scan-spinner"></span>${t('ble_scanning')}`;

      const nearbyList = document.getElementById('ble-nearby-list');
      if (nearbyList) {
        nearbyList.innerHTML = `<p class="empty-state">${t('ble_scanning')}</p>`;
      }

      try {
        const devices = await scanForDevices();
        renderNearbyDevices(devices);
      } catch (err) {
        console.error('[BLE Picker] Scan error:', err);
        haptics.notification('error');
        if (nearbyList) {
          nearbyList.innerHTML = `<p class="empty-state" style="color:var(--danger);">${t('ble_scan_error')}</p>`;
        }
      } finally {
        scanBtn.classList.remove('scanning');
        scanBtn.textContent = t('ble_scan_btn');
      }
    });
  }
}

/**
 * Opens the Bluetooth selector modal and populates lists.
 */
async function openBlePickerModal({ targetInput, targetText, currentValue }) {
  activeTargetInput = targetInput;
  activeTargetText = targetText;

  const modal = document.getElementById('ble-picker-modal');
  const nearbyList = document.getElementById('ble-nearby-list');

  if (!modal) return;

  // Clear previous scan results
  if (nearbyList) {
    nearbyList.innerHTML = `<p class="empty-state" data-i18n="ble_no_nearby">${t('ble_no_nearby')}</p>`;
  }

  // Load and render Saved Devices
  const saved = await loadSavedDevices();
  renderSavedDevices(saved, currentValue);

  // Open modal
  modal.showModal();
}

/**
 * Handles selecting a BLE Device, updating input, triggering haptic, and closing modal.
 */
function selectDevice(id, name = '') {
  if (activeTargetInput && activeTargetText) {
    activeTargetInput.value = id;
    updateTriggerLabel(activeTargetText, id);
    if (id) {
      saveBluetoothDevice(id, name);
    }
  }

  const modal = document.getElementById('ble-picker-modal');
  if (modal) {
    modal.close();
  }
}

/**
 * Render the Saved Devices list in the modal.
 */
function renderSavedDevices(devices, currentValue) {
  const listEl = document.getElementById('ble-saved-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  // 1. None Option (Disconnect)
  const noneBtn = document.createElement('button');
  noneBtn.type = 'button';
  noneBtn.className = `ble-device-item disconnect-item ${!currentValue ? 'selected' : ''}`;
  noneBtn.innerHTML = `
    <div class="ble-device-info">
      <span class="ble-device-icon">❌</span>
      <div class="ble-device-details">
        <span class="ble-device-name">${t('ble_disconnect_option')}</span>
        <span class="ble-device-id">None</span>
      </div>
    </div>
  `;
  noneBtn.addEventListener('click', () => {
    haptics.impact('light');
    selectDevice('', '');
  });
  listEl.appendChild(noneBtn);

  // 2. Saved list items
  if (devices.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = t('ble_no_saved');
    listEl.appendChild(empty);
    return;
  }

  devices.forEach(dev => {
    const isSelected = dev.id === currentValue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ble-device-item ${isSelected ? 'selected' : ''}`;
    btn.innerHTML = `
      <div class="ble-device-info">
        <span class="ble-device-icon">📱</span>
        <div class="ble-device-details">
          <span class="ble-device-name">${dev.name || dev.id}</span>
          <span class="ble-device-id">${dev.id}</span>
        </div>
      </div>
      <span class="ble-device-status-badge">${isSelected ? 'Active' : 'Saved'}</span>
    `;
    btn.addEventListener('click', () => {
      haptics.impact('medium');
      selectDevice(dev.id, dev.name);
    });
    listEl.appendChild(btn);
  });
}

/**
 * Render the Nearby Scanned Devices list.
 */
function renderNearbyDevices(devices) {
  const listEl = document.getElementById('ble-nearby-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  if (devices.length === 0) {
    listEl.innerHTML = `<p class="empty-state">${t('ble_no_devices')}</p>`;
    return;
  }

  const currentValue = activeTargetInput ? activeTargetInput.value : '';

  devices.forEach(dev => {
    const isSelected = dev.id === currentValue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `ble-device-item ${isSelected ? 'selected' : ''}`;
    btn.innerHTML = `
      <div class="ble-device-info">
        <span class="ble-device-icon">📶</span>
        <div class="ble-device-details">
          <span class="ble-device-name">${dev.name || 'Unknown Device'}</span>
          <span class="ble-device-id">${dev.id}</span>
        </div>
      </div>
      <span class="ble-device-status-badge">${isSelected ? 'Active' : 'Nearby'}</span>
    `;
    btn.addEventListener('click', () => {
      haptics.impact('medium');
      selectDevice(dev.id, dev.name);
    });
    listEl.appendChild(btn);
  });
}
