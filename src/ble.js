/**
 * ble.js — BLE Device Scanner & Selector Utility
 *
 * Provides a function to scan for nearby Bluetooth LE devices and populate
 * a <select> element. On native platforms (iOS/Android) it uses the
 * @capacitor-community/bluetooth-le plugin. On web it falls back gracefully
 * to showing a manual text-entry field.
 */

import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import { t } from './i18n';

const SCAN_DURATION_MS = 5000; // How long to scan before stopping

/**
 * @typedef {Object} BleDeviceEntry
 * @property {string} id    - Device ID / MAC address / UUID
 * @property {string} name  - Human-readable device name (may be empty)
 */

/**
 * Returns true when running on a native platform with BLE available.
 */
function isBleAvailable() {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.isPluginAvailable('BluetoothLe')
  );
}

/**
 * Scan for BLE devices and return a list of discovered entries.
 * @returns {Promise<BleDeviceEntry[]>}
 */
async function scanForDevices() {
  await BleClient.initialize({ androidNeverForLocation: true });

  const found = new Map(); // deviceId -> BleDeviceEntry (deduped)

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(async () => {
      try {
        await BleClient.stopLEScan();
      } catch (_) { /* ignore */ }
      resolve();
    }, SCAN_DURATION_MS);

    BleClient.requestLEScan(
      {
        allowDuplicates: false,
      },
      (result) => {
        const id   = result.device?.deviceId;
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
 * Wires up a "Scan" button + <select> + optional manual-entry <input> for a
 * BLE device picker.
 *
 * @param {Object} opts
 * @param {string}  opts.selectId        - ID of the <select> element
 * @param {string}  opts.scanBtnId       - ID of the Scan button
 * @param {string}  opts.manualRowId     - ID of the hidden manual-entry wrapper div
 * @param {string}  opts.manualInputId   - ID of the manual text <input>
 * @param {string}  [opts.currentValue]  - Pre-selected value to restore (if any)
 */
export function initBleSelector({
  selectId,
  scanBtnId,
  manualRowId,
  manualInputId,
  currentValue = '',
}) {
  const select    = document.getElementById(selectId);
  const scanBtn   = document.getElementById(scanBtnId);
  const manualRow = document.getElementById(manualRowId);
  const manualInput = document.getElementById(manualInputId);

  if (!select || !scanBtn) return;

  /**
   * Rebuilds the <select> options from a list of discovered devices.
   * Always appends a "Enter manually" sentinel option at the end.
   */
  function populateSelect(devices, preselectValue = '') {
    // Clear existing dynamic options (keep the first blank placeholder)
    select.innerHTML = `<option value="">${t('ble_select_placeholder')}</option>`;

    for (const dev of devices) {
      const opt = document.createElement('option');
      opt.value = dev.id;
      opt.textContent = dev.name ? `${dev.name} (${dev.id})` : dev.id;
      select.appendChild(opt);
    }

    // Sentinel "Enter manually" option
    const manualOpt = document.createElement('option');
    manualOpt.value = '__manual__';
    manualOpt.textContent = t('ble_manual_entry');
    select.appendChild(manualOpt);

    // Restore previous value if it still exists in the list
    if (preselectValue) {
      const existingOpt = Array.from(select.options).find(o => o.value === preselectValue);
      if (existingOpt) {
        select.value = preselectValue;
      } else if (preselectValue !== '') {
        // Value is not in the list — add it as a synthetic option and select it
        const customOpt = document.createElement('option');
        customOpt.value = preselectValue;
        customOpt.textContent = preselectValue;
        // Insert before the "manual" sentinel
        select.insertBefore(customOpt, manualOpt);
        select.value = preselectValue;
      }
    }

    handleSelectChange();
  }

  /** Shows/hides the manual input depending on select value. */
  function handleSelectChange() {
    if (select.value === '__manual__') {
      manualRow.classList.remove('hidden');
      if (manualInput) manualInput.focus();
    } else {
      manualRow.classList.add('hidden');
    }
  }

  select.addEventListener('change', handleSelectChange);

  /** Returns the currently chosen BLE device ID (either from select or manual input). */
  // Exposed on the DOM element for convenient retrieval by the form handler
  select._getBleValue = () => {
    if (select.value === '__manual__') {
      return manualInput ? manualInput.value.trim() : '';
    }
    return select.value;
  };

  // ---- Scan Button Handler ----
  scanBtn.addEventListener('click', async () => {
    if (!isBleAvailable()) {
      // On web — just reveal the manual input
      populateSelect([], currentValue);
      select.value = '__manual__';
      handleSelectChange();
      return;
    }

    // Show spinner state
    const originalLabel = scanBtn.textContent;
    scanBtn.classList.add('scanning');
    scanBtn.innerHTML = `<span class="scan-spinner"></span>${t('ble_scanning')}`;

    try {
      const devices = await scanForDevices();

      if (devices.length === 0) {
        populateSelect([], currentValue);
        // Pick the "Enter manually" option automatically when nothing found
        select.value = '__manual__';
        handleSelectChange();
      } else {
        populateSelect(devices, currentValue);
      }
    } catch (err) {
      console.error('[BLE Scan] Error during scan:', err);
      // Fall back to manual entry
      populateSelect([], currentValue);
      select.value = '__manual__';
      handleSelectChange();
    } finally {
      scanBtn.classList.remove('scanning');
      scanBtn.textContent = t('ble_scan_btn');
    }
  });

  // ---- Initial Population ----
  // On first open, seed the list with bonded/connected devices if on native,
  // otherwise just show the placeholder + manual option immediately.
  (async () => {
    if (!isBleAvailable()) {
      // Web mode: only show "manual" option pre-populated
      populateSelect([], currentValue);
      if (currentValue) {
        select.value = '__manual__';
        if (manualInput) manualInput.value = currentValue;
        handleSelectChange();
      }
      return;
    }

    try {
      await BleClient.initialize({ androidNeverForLocation: true });

      // Try to retrieve bonded devices (Android) or previously known devices
      let knownDevices = [];

      // Android: getBondedDevices
      try {
        const bonded = await BleClient.getBondedDevices();
        if (Array.isArray(bonded)) {
          for (const d of bonded) {
            knownDevices.push({ id: d.deviceId, name: d.name || '' });
          }
        }
      } catch (_) { /* not available on iOS */ }

      // All platforms: getConnectedDevices (no service filter = all)
      try {
        const connected = await BleClient.getConnectedDevices([]);
        if (Array.isArray(connected)) {
          for (const d of connected) {
            if (!knownDevices.find(k => k.id === d.deviceId)) {
              knownDevices.push({ id: d.deviceId, name: d.name || '' });
            }
          }
        }
      } catch (_) { /* ignore */ }

      populateSelect(knownDevices, currentValue);
    } catch (err) {
      console.warn('[BLE Selector] Could not load initial devices:', err);
      populateSelect([], currentValue);
      if (currentValue) {
        select.value = currentValue !== '' ? currentValue : '';
      }
    }
  })();
}

/**
 * Retrieves the selected BLE device ID from an initialised selector.
 * Works for both select-chosen and manually-typed values.
 *
 * @param {string} selectId   - ID of the <select> element
 * @param {string} manualInputId - ID of the manual <input> element
 * @returns {string}
 */
export function getBleValue(selectId, manualInputId) {
  const select = document.getElementById(selectId);
  if (!select) return '';
  if (typeof select._getBleValue === 'function') {
    return select._getBleValue();
  }
  // Fallback: read the select value directly
  const val = select.value;
  if (val === '__manual__') {
    const input = document.getElementById(manualInputId);
    return input ? input.value.trim() : '';
  }
  return val;
}
