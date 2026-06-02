import L from 'leaflet';
import 'leaflet/dist/leaflet.css'; // Bundle Leaflet CSS locally for offline/Capacitor reliability
import { Geolocation } from '@capacitor/geolocation';
import { haptics } from './haptics';
import { t } from './i18n';

let mapInstance = null;
let mapInitPromise = null;
let markersGroup = null;
let watchId = null;
let userLocationMarker = null;

// Initial default center (e.g. New York)
const DEFAULT_LAT = 40.7128;
const DEFAULT_LNG = -74.0060;
const DEFAULT_ZOOM = 13;

/**
 * Initializes the Leaflet map centered at user location or default.
 * @param {string} elementId - ID of HTML container
 */
export async function initMap(elementId = 'map') {
  if (mapInstance) {
    // Force Leaflet to re-calculate container dimensions and redraw tiles
    setTimeout(() => {
      if (mapInstance) {
        mapInstance.invalidateSize();
      }
    }, 150);
    return mapInstance;
  }
  if (mapInitPromise) return mapInitPromise;

  mapInitPromise = (async () => {
    let lat = DEFAULT_LAT;
    let lng = DEFAULT_LNG;

    try {
      console.log('[Map] Attempting GPS Geolocation request...');
      // Attempt to request geolocation
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000
      });
      console.log('[Map] GPS Geolocation request completed successfully.');
      if (coordinates && coordinates.coords) {
        lat = coordinates.coords.latitude;
        lng = coordinates.coords.longitude;
        console.log(`[Map] User location loaded: ${lat}, ${lng}`);
      }
    } catch (err) {
      console.warn('[Map] Could not fetch user location. Centering at default coordinates.', err);
    }

    // Double check if another call succeeded while we were awaiting geolocation
    if (mapInstance) {
      mapInitPromise = null;
      return mapInstance;
    }

    const container = document.getElementById(elementId);
    if (!container) {
      mapInitPromise = null;
      throw new Error(`[Map] Container element #${elementId} not found in DOM`);
    }

    // Recover from HMR module-reload state where mapInstance is null but the DOM element remains initialized
    if (container._leaflet_id) {
      console.warn('[Map] Container already has a Leaflet ID. Recreating DOM element to reset state.');
      const parent = container.parentNode;
      const nextSibling = container.nextSibling;
      
      const newContainer = document.createElement('div');
      newContainer.id = elementId;
      newContainer.className = container.className;
      
      parent.removeChild(container);
      if (nextSibling) {
        parent.insertBefore(newContainer, nextSibling);
      } else {
        parent.appendChild(newContainer);
      }
    }

    try {
      // Create Leaflet map
      mapInstance = L.map(elementId, {
        zoomControl: true,
        attributionControl: false
      }).setView([lat, lng], DEFAULT_ZOOM);

      // Load OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(mapInstance);

      // Group to manage object markers
      markersGroup = L.layerGroup().addTo(mapInstance);

      // Initial user marker location
      updateUserLocationMarker(lat, lng);

      // Start watching user's location to keep the blue dot updated in real-time
      startWatchingLocation();

      // Add click vibration behavior to zoom buttons, etc.
      mapInstance.on('zoomend', () => {
        haptics.impact('light');
      });

      // Force recalculation of map container dimensions once loaded and overlay hidden
      setTimeout(() => {
        if (mapInstance) {
          mapInstance.invalidateSize();
        }
      }, 500);

      mapInitPromise = null;
      return mapInstance;
    } catch (err) {
      console.error('[Map] Initialization failed:', err);
      mapInstance = null;
      mapInitPromise = null;
      throw err;
    }
  })();

  return mapInitPromise;
}

/**
 * Updates or creates the user's current location marker (blue dot).
 */
export function updateUserLocationMarker(lat, lng) {
  if (!mapInstance) return;

  const customIcon = L.divIcon({
    className: 'user-location-marker',
    html: `
      <div class="user-location-container">
        <div class="user-location-pulse"></div>
        <div class="user-location-dot"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  if (userLocationMarker) {
    userLocationMarker.setLatLng([lat, lng]);
  } else {
    userLocationMarker = L.marker([lat, lng], { icon: customIcon }).addTo(mapInstance);
  }
}

/**
 * Starts watching user's location to update the blue dot in real-time.
 */
async function startWatchingLocation() {
  if (watchId !== null) return;
  try {
    watchId = await Geolocation.watchPosition({
      enableHighAccuracy: true,
      timeout: 10000
    }, (position, err) => {
      if (err) {
        console.error('[Map] Error watching location:', err);
        return;
      }
      if (position && position.coords) {
        const { latitude, longitude } = position.coords;
        updateUserLocationMarker(latitude, longitude);
      }
    });
  } catch (err) {
    console.error('[Map] Failed to start watching location:', err);
  }
}

/**
 * Clean up the Leaflet map instance and related markers group on logout.
 */
export function destroyMap() {
  if (watchId !== null) {
    try {
      Geolocation.clearWatch({ id: watchId });
    } catch (err) {
      console.warn('[Map] Error clearing location watch:', err);
    }
    watchId = null;
  }
  if (userLocationMarker) {
    try {
      userLocationMarker.remove();
    } catch (err) {
      console.warn('[Map] Error removing user location marker:', err);
    }
    userLocationMarker = null;
  }
  if (mapInstance) {
    try {
      mapInstance.remove();
    } catch (err) {
      console.warn('[Map] Error during map removal:', err);
    }
    mapInstance = null;
  }
  markersGroup = null;
  mapInitPromise = null;
  console.log('[Map] Map instance successfully destroyed and resources freed.');
}

/**
 * Focuses the map on specific coordinates.
 */
export function centerMap(lat, lng, zoom = 15) {
  if (mapInstance) {
    mapInstance.setView([lat, lng], zoom);
    haptics.impact('medium');
  }
}

/**
 * Centered on current device location.
 */
export async function centerOnCurrentLocation() {
  try {
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true
    });
    if (coordinates && coordinates.coords) {
      const lat = coordinates.coords.latitude;
      const lng = coordinates.coords.longitude;
      updateUserLocationMarker(lat, lng);
      centerMap(lat, lng);
      haptics.notification('success');
    }
  } catch (err) {
    console.error('Error getting location', err);
    haptics.notification('error');
  }
}

/**
 * Updates the markers on the map with current list of vehicles.
 * @param {Array} objects - The list of car objects
 * @param {Object} usersMap - Map of user profiles by user ID
 * @param {Array} groupsList - List of groups to query group names
 */
export function updateMapMarkers(objects, usersMap = {}, groupsList = []) {
  if (!markersGroup || !mapInstance) return;

  // Clear previous markers
  markersGroup.clearLayers();

  const groupsMap = new Map(groupsList.map(g => [g.id, g.name]));

  objects.forEach(obj => {
    const lat = parseFloat(obj.last_latitude);
    const lng = parseFloat(obj.last_longitude);

    if (isNaN(lat) || isNaN(lng)) return;

    // Create a custom glassmorphic DivIcon for the vehicle emoji marker
    const customIcon = L.divIcon({
      className: 'custom-vehicle-marker',
      html: `
        <div class="marker-container">
          <div class="marker-pulse"></div>
          <div class="marker-bubble glass-panel">${obj.icon || '🚗'}</div>
          <div class="marker-label">${obj.name}</div>
        </div>
      `,
      iconSize: [40, 50],
      iconAnchor: [20, 45],
      popupAnchor: [0, -45]
    });

    // Populate popup content
    const updatedByUser = usersMap[obj.last_updated_by] || { username: t('system_user'), avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=placeholder' };
    const groupName = groupsMap.get(obj.group_id) || t('unknown_group');
    const timestamp = obj.last_updated_at ? new Date(obj.last_updated_at).toLocaleString() : t('map_never');

    const popupHtml = `
      <div class="popup-inner">
        <div class="popup-title-row">
          <span>${obj.icon || '🚗'}</span>
          <span>${obj.name}</span>
        </div>
        <div class="popup-group-badge">${groupName}</div>
        <div style="font-size:0.8rem; margin-top:2px;">
          <strong>${t('map_coords')}:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}
        </div>
        <div class="popup-meta-row">
          <img class="popup-avatar" src="${updatedByUser.avatar_url}" alt="${updatedByUser.username}">
          <div>
            <div style="font-weight:600;">${updatedByUser.username}</div>
            <div style="font-size:0.7rem; color:var(--text-muted);">${timestamp}</div>
          </div>
        </div>
        <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="popup-gmaps-btn">
          <svg class="gmaps-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
          <span>${t('open_in_gmaps')}</span>
        </a>
      </div>
    `;

    const marker = L.marker([lat, lng], { icon: customIcon });
    marker.bindPopup(popupHtml, {
      className: 'custom-map-popup',
      closeButton: false
    });

    // Vibration feedback on opening popup
    marker.on('click', () => {
      haptics.impact('light');
    });

    markersGroup.addLayer(marker);
  });
}
