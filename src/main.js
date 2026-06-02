import { supabase, useMockMode } from './supabase';
import { initMap, updateMapMarkers, centerMap, destroyMap } from './map';
import { haptics } from './haptics';
import { initUI, showAuthOverlay, updateProfileUI, updateGroupsUI, showToast } from './ui';
import { Geolocation } from '@capacitor/geolocation';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { t, getCurrentLanguage, setLanguage, translateDOM } from './i18n';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { AdMob } from '@capacitor-community/admob';

// --- State Engine ---
let currentUser = null;
let myGroups = [];
let myObjects = [];
let usersMap = {}; // Maps profile UUIDs to profile structures
let myDevicesMap = {}; // Maps object_id to ble_device_id for current user
let loginIncrementedThisSession = false;

/**
 * Boots the application, registers auth hooks, and binds UI actions.
 */
async function bootApp() {
  console.log('[Main] Booting SharedParking...');

  // Initialize and apply correct language setting
  const initialLang = getCurrentLanguage();
  setLanguage(initialLang);

  // Initialize UI event listeners
  initUI({
    onLogin,
    onSocialLogin,
    onRegister,
    onLogout,
    onCreateGroup,
    onJoinGroup,
    onLeaveGroup,
    onAddObject,
    onDeleteObject,
    onPairDevice,
    onLocateObject: (lat, lng) => centerMap(lat, lng, 16),
    onSimulateBleDisconnect,
    onLanguageChange: async (lang) => {
      // Re-render dynamically structure UI blocks
      updateGroupsUI(myGroups, myObjects, myDevicesMap);
      updateMapMarkers(myObjects, usersMap, myGroups);
    }
  });

  // Handle deep-link callback from OAuth (iOS/Android native)
  // When the in-app browser redirects back to com.bartua1.sharedparking://
  // this listener fires with the URL containing the access/refresh tokens.
  App.addListener('appUrlOpen', async ({ url }) => {
    console.log('[OAuth] appUrlOpen received:', url);
    if (!url.startsWith('com.bartua1.sharedparking://') && !url.startsWith('com.bartua1.sharedparking:')) return;

    // Close the in-app browser immediately
    await Browser.close().catch(() => {});

    // Parse both fragment (#) and query string (?) — Supabase uses either depending on flow
    const afterScheme = url.replace(/^com\.bartua1\.sharedparking:\/?\/?/, '');
    const fragmentPart = afterScheme.includes('#') ? afterScheme.split('#')[1] : '';
    const queryPart = afterScheme.includes('?') ? afterScheme.split('?')[1].split('#')[0] : '';
    const params = new URLSearchParams(fragmentPart || queryPart);

    // Check if Supabase returned an error (e.g. redirect URL not allowlisted)
    const errorCode = params.get('error');
    const errorDescription = params.get('error_description');
    if (errorCode) {
      const msg = errorDescription
        ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
        : errorCode;
      console.error('[OAuth] Supabase returned error:', errorCode, msg);
      haptics.notification('error');
      showToast(`Login failed: ${msg}`, 'error');
      return;
    }

    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        console.error('[OAuth] setSession failed:', error);
        haptics.notification('error');
        showToast(t(error.message), 'error');
      } else {
        console.log('[OAuth] Session set successfully from deep link.');
        haptics.notification('success');
        showToast(t('toast_signin_success'), 'success');
      }
    } else {
      console.warn('[OAuth] Deep-link URL missing tokens:', url);
      haptics.notification('error');
      showToast('Login failed: no tokens received from server', 'error');
    }
  });

  // 1. Get user location and Display map
  console.log('[Main] Getting user location and initializing map...');
  try {
    await initMap('map');
  } catch (err) {
    console.error('[Main] Map initialization failed:', err);
  }

  // 2. Check user auth status
  console.log('[Auth] Recovering session...');
  try {
    await supabase.auth.getSession();
  } catch (err) {
    console.warn('[Auth] Error during initial session recovery:', err);
  }
  console.log('[Auth] Session recovery complete.');

  // Track Auth status from Supabase
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[Auth Event] ${event}, session:`, session);
    
    // Defer database/async logic to next event loop tick to prevent internal Supabase deadlocks on load
    setTimeout(async () => {
      try {
        if (session && session.user) {
          // User logged in
          currentUser = {
            id: session.user.id,
            email: session.user.email,
            username: session.user.username || session.user.user_metadata?.username || session.user.email.split('@')[0],
            avatar_url: session.user.avatar_url || session.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${session.user.id}`
          };
          console.log('[Auth] currentUser parsed:', currentUser);

          // Sync profile and increment total logins once per app launch session
          if (!loginIncrementedThisSession) {
            loginIncrementedThisSession = true;
            let totalLogins = 0;
            try {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('total_logins')
                .eq('id', currentUser.id)
                .single();
              if (profileData) {
                totalLogins = profileData.total_logins || 0;
              }
            } catch (err) {
              console.warn('[Auth] Failed to fetch total_logins:', err);
            }

            const currentTotal = totalLogins + 1;
            console.log(`[Auth] Syncing profile with DB via upsert... Current logins: ${currentTotal}`);

            const { error: upsertErr } = await supabase.from('profiles').upsert({
              id: currentUser.id,
              username: currentUser.username,
              avatar_url: currentUser.avatar_url,
              total_logins: currentTotal,
              updated_at: new Date().toISOString()
            });
            console.log('[Auth] Profile sync finished. Error status:', upsertErr);

            if (upsertErr) {
              console.error('[Auth] Profile sync failed:', upsertErr);
              showToast(`Profile sync failed: ${upsertErr.message}`, 'error');
            }

            // Trigger the App Open Ad starting from the 50th login/app open
            if (currentTotal >= 50) {
              await triggerAppOpenAd();
            }
          }

          updateProfileUI(currentUser);
          showAuthOverlay(false);
          
          // Populate the map with shared vehicle locations
          console.log('[Auth] Starting syncData...');
          await syncData();
          console.log('[Auth] syncData finished.');
          
          // Initialize native Bluetooth listener
          initNativeBluetoothListener();
        } else {
          console.log('[Auth] Entering signed-out flow. Session state:', session);
          // User logged out
          currentUser = null;
          myGroups = [];
          myObjects = [];
          usersMap = {};
          
          // Clear vehicle markers on map instead of destroying it completely,
          // allowing the map to remain visible (but blurred) behind the auth screen.
          updateMapMarkers([], {}, []);
          updateProfileUI(null);
          showAuthOverlay(true);
        }
      } catch (err) {
        console.error('[Auth Event Handler Error]:', err);
        showToast(`Auth setup failed: ${err.message || err}`, 'error');
      }
    }, 0);
  });
}

/**
 * Fetches current groups, objects, and member profiles from Supabase/MockDB.
 */
async function syncData() {
  if (!currentUser) return;

  try {
    console.log('[Main] Syncing data from backend...');

    // 1. Fetch Group Memberships
    const { data: memberships, error: memError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', currentUser.id);

    if (memError) throw memError;

    const groupIds = memberships.map(m => m.group_id);

    if (groupIds.length === 0) {
      myGroups = [];
      myObjects = [];
      usersMap = {};
      updateGroupsUI([], [], currentUser.id);
      updateMapMarkers([], {}, []);
      return;
    }

    // 2. Fetch Groups details
    const { data: groups, error: grpError } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds);

    if (grpError) throw grpError;
    myGroups = groups;

    // 3. Fetch Tracked Objects (Vehicles) belonging to these groups
    const { data: objects, error: objError } = await supabase
      .from('objects')
      .select('*')
      .in('group_id', groupIds);

    if (objError) throw objError;
    myObjects = objects;

    // Fetch User-Specific Bluetooth Devices
    const { data: devices, error: devError } = await supabase
      .from('user_object_devices')
      .select('*')
      .eq('user_id', currentUser.id);

    if (devError) throw devError;

    myDevicesMap = {};
    devices.forEach(d => {
      myDevicesMap[d.object_id] = d.ble_device_id;
    });

    // 4. Fetch all group member profiles to compile avatar display names
    const { data: allMembers, error: allMemError } = await supabase
      .from('group_members')
      .select('user_id')
      .in('group_id', groupIds);

    if (allMemError) throw allMemError;

    const allMemberIds = [...new Set(allMembers.map(m => m.user_id))];

    // Fetch corresponding profiles
    const { data: profiles, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', allMemberIds);

    if (profError) throw profError;

    // Compile into hashmap
    usersMap = {};
    profiles.forEach(p => {
      usersMap[p.id] = p;
    });

    // 5. Redraw UI & Map Markers
    updateGroupsUI(myGroups, myObjects, myDevicesMap);
    updateMapMarkers(myObjects, usersMap, myGroups);
    
    console.log('[Main] Data synced successfully.');
  } catch (err) {
    console.error('[Main] Sync failed:', err);
    showToast(t('toast_sync_error'), 'error');
  }
}

// --- Auth Callback Event Handlers ---

async function onLogin(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    haptics.notification('error');
    showToast(t(error.message), 'error');
  } else {
    haptics.notification('success');
    showToast(t('toast_signin_success'), 'success');
  }
}

async function onSocialLogin(provider) {
  const isNative = window.Capacitor?.isNativePlatform?.() ?? false;

  // --- Native Apple Sign-In (iOS) ---
  // Apple guidelines require using the native Sign in with Apple SDK, not a web redirect.
  // Flow: native Apple sheet → identity token → supabase.auth.signInWithIdToken
  if (provider === 'apple' && isNative) {
    try {
      const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
      const result = await SignInWithApple.authorize({
        clientId: 'com.bartua1.sharedparking',
        redirectURI: 'https://goxvofvktzonilnykjff.supabase.co/auth/v1/callback',
        scopes: 'email name',
        state: Math.random().toString(36).substring(2),
        nonce: Math.random().toString(36).substring(2),
      });

      const identityToken = result?.response?.identityToken;
      if (!identityToken) {
        throw new Error('No identity token received from Apple.');
      }

      // Exchange Apple identity token with Supabase
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
      });

      if (error) {
        haptics.notification('error');
        showToast(t(error.message), 'error');
      } else {
        haptics.notification('success');
        showToast(t('toast_signin_success'), 'success');
      }
    } catch (err) {
      // User cancelled the Apple sheet — don't show an error toast
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('cancel') || err?.code === '1001') return;
      console.error('[Apple Sign-In] Error:', err);
      haptics.notification('error');
      showToast(`Apple Sign-In failed: ${msg || 'Unknown error'}`, 'error');
    }
    return;
  }

  if (isNative) {
    // --- Native OAuth flow for Google (and other providers) ---
    // Step 1: Get the OAuth URL from Supabase WITHOUT auto-opening it.
    // Step 2: Open it in Capacitor's in-app browser (avoids the "untrusted request" error).
    // Step 3: appUrlOpen listener (registered in bootApp) catches the com.bartua1.sharedparking:// deep link.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'com.bartua1.sharedparking://',
        skipBrowserRedirect: true,   // Don't open browser automatically
      }
    });

    if (error) {
      haptics.notification('error');
      showToast(t(error.message), 'error');
      return;
    }

    if (data?.url) {
      await Browser.open({ url: data.url, windowName: '_self' });
    }
  } else {
    // --- Web browser OAuth flow ---
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    });

    if (error) {
      haptics.notification('error');
      showToast(t(error.message), 'error');
    }
  }
}

async function onRegister(email, password, username, avatarSeed) {
  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}`;
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, avatar_seed: avatarSeed, avatar_url: avatarUrl }
    }
  });

  if (error) {
    haptics.notification('error');
    showToast(t(error.message), 'error');
  } else {
    haptics.notification('success');
    showToast(t('toast_register_success'), 'success');
  }
}

async function onLogout() {
  console.log('[Main] Log out request received.');
  loginIncrementedThisSession = false;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[Main] supabase.auth.signOut failed:', error);
      haptics.notification('error');
      showToast(t('toast_logout_failed'), 'error');
    } else {
      console.log('[Main] supabase.auth.signOut completed successfully.');
      haptics.notification('success');
      showToast(t('toast_logout_success'), 'info');
    }
  } catch (err) {
    console.error('[Main] Unexpected error during signOut:', err);
    haptics.notification('error');
    showToast(t('toast_logout_failed'), 'error');
  }
}

// --- Group Callback Event Handlers ---

async function onCreateGroup(name) {
  try {
    // 1. Insert Group record
    const { data: newGroups, error: gErr } = await supabase
      .from('groups')
      .insert({ name, created_by: currentUser.id })
      .select();

    if (gErr) throw gErr;
    const newGroup = newGroups[0];

    // 2. Add creator to membership join table
    const { error: mErr } = await supabase
      .from('group_members')
      .insert({ group_id: newGroup.id, user_id: currentUser.id });

    if (mErr) throw mErr;

    haptics.notification('success');
    showToast(t('toast_create_group_success', { name }), 'success');
    await syncData();
  } catch (err) {
    console.error(err);
    haptics.notification('error');
    showToast(t('toast_create_group_error') + ` (${err.message || err})`, 'error');
  }
}

async function onJoinGroup(code) {
  try {
    // Check if group actually exists (relevant check in both real and mock databases)
    const { data: targetGroup, error: gErr } = await supabase
      .from('groups')
      .select('*')
      .eq('id', code);

    if (gErr || !targetGroup || targetGroup.length === 0) {
      haptics.notification('error');
      showToast(t('toast_group_not_found'), 'error');
      return;
    }

    // Insert group membership
    const { error: mErr } = await supabase
      .from('group_members')
      .insert({ group_id: code, user_id: currentUser.id });

    if (mErr) {
      if (mErr.message && mErr.message.includes('unique')) {
        showToast(t('toast_already_member'), 'warning');
      } else {
        throw mErr;
      }
    } else {
      haptics.notification('success');
      showToast(t('toast_join_group_success', { name: targetGroup[0].name }), 'success');
    }

    await syncData();
  } catch (err) {
    console.error(err);
    haptics.notification('error');
    showToast(t('toast_join_group_error'), 'error');
  }
}

async function onLeaveGroup(groupId) {
  try {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', currentUser.id);

    if (error) throw error;

    haptics.notification('success');
    showToast(t('toast_leave_group_success'), 'success');
    await syncData();
  } catch (err) {
    console.error(err);
    haptics.notification('error');
    showToast(t('toast_leave_group_error'), 'error');
  }
}

// --- Object (Vehicle) Callback Event Handlers ---

async function onAddObject(name, groupId, icon, bleDevice) {
  try {
    let lat = 40.7128;
    let lng = -74.0060;

    // Get current GPS coords to initialize vehicle coordinates
    try {
      const pos = await Geolocation.getCurrentPosition({ timeout: 4000 });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch (e) {
      console.warn('Geolocation timing out. Defaulting coordinates.', e);
    }

    const { data: newObjs, error } = await supabase
      .from('objects')
      .insert({
        name,
        group_id: groupId,
        icon,
        last_latitude: lat,
        last_longitude: lng,
        last_updated_at: new Date().toISOString(),
        last_updated_by: currentUser.id
      })
      .select();

    if (error) throw error;
    const newObj = newObjs[0];

    // If Bluetooth device was registered, associate it immediately
    if (bleDevice && bleDevice.trim()) {
      const { error: pairError } = await supabase
        .from('user_object_devices')
        .insert({
          user_id: currentUser.id,
          object_id: newObj.id,
          ble_device_id: bleDevice
        });
      if (pairError) console.error('BLE auto-pairing failed:', pairError);
    }

    haptics.notification('success');
    showToast(t('toast_register_vehicle_success', { name }), 'success');
    await syncData();
    
    // Auto center map on the newly added vehicle
    centerMap(lat, lng, 16);
  } catch (err) {
    console.error(err);
    haptics.notification('error');
    showToast(t('toast_register_vehicle_error'), 'error');
  }
}

async function onPairDevice(objectId, bleId) {
  try {
    if (!bleId.trim()) {
      // Delete pairing
      const { error } = await supabase
        .from('user_object_devices')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('object_id', objectId);

      if (error) throw error;
      showToast(t('toast_ble_removed'), 'info');
    } else {
      // Upsert pairing
      const { error } = await supabase
        .from('user_object_devices')
        .upsert({
          user_id: currentUser.id,
          object_id: objectId,
          ble_device_id: bleId
        });

      if (error) throw error;
      showToast(t('toast_ble_associated'), 'success');
    }
    haptics.notification('success');
    await syncData();
  } catch (err) {
    console.error(err);
    showToast(t('toast_ble_pair_error'), 'error');
  }
}

async function onDeleteObject(objectId) {
  try {
    const { error } = await supabase
      .from('objects')
      .delete()
      .eq('id', objectId);

    if (error) throw error;

    haptics.notification('success');
    showToast(t('toast_vehicle_deleted'), 'success');
    await syncData();
  } catch (err) {
    console.error(err);
    showToast(t('toast_vehicle_delete_error'), 'error');
  }
}

// --- Bluetooth & Simulation Functions ---

/**
 * Triggers the automatic parking update on device disconnection.
 * Feeds coordinates via GPS, and makes a POST request to update Supabase.
 */
async function updateLocationForBLEDevice(bleDeviceId) {
  if (!currentUser) return;

  // Find corresponding vehicle using user mappings
  let targetObjectId = null;
  for (const [objId, devId] of Object.entries(myDevicesMap)) {
    if (devId === bleDeviceId) {
      targetObjectId = objId;
      break;
    }
  }

  const targetObj = myObjects.find(obj => obj.id === targetObjectId);
  if (!targetObj) {
    console.warn(`[BLE] No vehicle linked to BLE ID: ${bleDeviceId} for the active user.`);
    return;
  }

  console.log(`[BLE] Updating parking location for: ${targetObj.name}`);

  try {
    // 1. Fetch Location coordinates
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true
    });
    
    const lat = coordinates.coords.latitude;
    const lng = coordinates.coords.longitude;

    // 2. Perform POST request simulation (supporting both edge functions or raw tables updates)
    // Here we make a POST request to show how native background scripts hit the server
    const postPayload = {
      object_id: targetObj.id,
      ble_device_id: bleDeviceId,
      latitude: lat,
      longitude: lng,
      updated_by: currentUser.id
    };

    console.log(`[BLE POST] Sending location payload to Supabase server:`, postPayload);
    
    // Optional: Real fetch call to Deno edge function:
    // await fetch(`${supabaseUrl}/functions/v1/update-parking-location`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ...` },
    //   body: JSON.stringify(postPayload)
    // });

    // Directly update Database table
    const { error } = await supabase
      .from('objects')
      .update({
        last_latitude: lat,
        last_longitude: lng,
        last_updated_at: new Date().toISOString(),
        last_updated_by: currentUser.id
      })
      .eq('id', targetObj.id);

    if (error) throw error;

    haptics.notification('success');
    showToast(t('toast_auto_logged', { name: targetObj.name }), 'success');
    
    // Refresh state
    await syncData();
    
    // Focus map
    centerMap(lat, lng, 16);
  } catch (err) {
    console.error('[BLE Disconnect Update Failed]', err);
    haptics.notification('error');
    showToast(t('toast_auto_logged_error'), 'error');
  }
}

/**
 * Manually triggered simulator in the web view.
 */
async function onSimulateBleDisconnect(bleDeviceId, objectId) {
  const target = myObjects.find(o => o.id === objectId);
  if (!target) return;

  showToast(t('toast_simulating_disconnect', { name: target.name }), 'info');
  await updateLocationForBLEDevice(bleDeviceId);
}

/**
 * Configures the native bluetooth background client wrapper.
 * Packages native device scan listeners for mobile runs.
 */
async function initNativeBluetoothListener() {
  const isBleAvailable = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isPluginAvailable('BluetoothLe');
  if (!isBleAvailable) {
    console.log('[BLE Client] Native BLE client unavailable in web mode.');
    return;
  }

  try {
    console.log('[BLE Client] Initializing Native Bluetooth LE listener...');
    await BleClient.initialize();
    
    // Start listening for connections/disconnections of registered devices
    for (const [objId, bleDeviceId] of Object.entries(myDevicesMap)) {
      if (!bleDeviceId || bleDeviceId === 'CAR_BLE_MOCK_DEV') continue;
      const obj = myObjects.find(o => o.id === objId);
      if (!obj) continue;

      console.log(`[BLE Client] Monitoring BLE device: ${bleDeviceId} for vehicle ${obj.name}`);
      
      try {
        await BleClient.connect(bleDeviceId, (disconnectedId) => {
          console.log(`[BLE Client] Device disconnected: ${disconnectedId}`);
          updateLocationForBLEDevice(disconnectedId);
        });
      } catch (connError) {
        console.warn(`[BLE Client] Passive monitoring connection failed for ${obj.name}:`, connError.message);
      }
    }
  } catch (err) {
    console.warn('[BLE Client] BleClient initialization failed:', err);
  }
}

/**
 * Trigger Google AdMob App Open Ad.
 */
async function triggerAppOpenAd() {
  const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
  const platform = window.Capacitor?.getPlatform() || 'web';
  const adId = platform === 'ios'
    ? import.meta.env.VITE_ADMOB_IOS_AD_ID
    : import.meta.env.VITE_ADMOB_ANDROID_AD_ID;

  console.log(`[AdMob] Triggering App Open Ad (platform: ${platform}, adId: ${adId})`);

  if (isNative && adId) {
    try {
      await AdMob.initialize();
      await AdMob.loadAppOpen({ adId });
      await AdMob.showAppOpen();
      console.log('[AdMob] App Open Ad shown successfully.');
    } catch (err) {
      console.error('[AdMob] Error showing App Open ad:', err);
    }
  } else {
    console.log('[AdMob Simulation] Simulating App Open ad on non-native platform or missing adId.');
    showToast('[Ad] App Open Ad Simulated', 'info');
  }
}

// Start app
bootApp();
