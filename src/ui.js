import { haptics } from './haptics';
import { t, setLanguage } from './i18n';
import { Capacitor } from '@capacitor/core';
import { initBleSelector, getBleValue } from './ble';

let uiCallbacks = {};
let openAccordions = new Set(); // Store open group accordion IDs to preserve state on redraw
let isSignUpMode = false;

/**
 * Helper to update auth UI based on registration or login mode.
 */
function setSignUpMode(enabled) {
  isSignUpMode = enabled;
  const signupFields = document.getElementById('signup-fields');
  const authToggleTxt = document.getElementById('auth-toggle-txt');
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const authFormTitle = document.getElementById('auth-form-title');
  const usernameInput = document.getElementById('auth-username');

  if (isSignUpMode) {
    if (signupFields) signupFields.classList.remove('hidden');
    if (authToggleTxt) authToggleTxt.textContent = t('have_account');
    if (authToggleBtn) authToggleBtn.textContent = t('signin_btn');
    if (authSubmitBtn) authSubmitBtn.textContent = t('signup_btn');
    if (authFormTitle) {
      authFormTitle.textContent = t('signup_btn');
      authFormTitle.setAttribute('data-i18n', 'signup_btn');
    }
    if (usernameInput) usernameInput.required = true;
  } else {
    if (signupFields) signupFields.classList.add('hidden');
    if (authToggleTxt) authToggleTxt.textContent = t('no_account');
    if (authToggleBtn) authToggleBtn.textContent = t('signup_btn');
    if (authSubmitBtn) authSubmitBtn.textContent = t('signin_btn');
    if (authFormTitle) {
      authFormTitle.textContent = t('signin_btn');
      authFormTitle.setAttribute('data-i18n', 'signin_btn');
    }
    if (usernameInput) usernameInput.required = false;
  }
}

/**
 * Initializes all UI event listeners and DOM element hooks.
 * @param {Object} callbacks - Hook callbacks for auth, group, and vehicle mutations
 */
export function initUI(callbacks) {
  uiCallbacks = callbacks;

  // --- Element Hooks ---
  const toggleSidenavBtn = document.getElementById('toggle-sidenav-btn');
  const closeSidenavBtn = document.getElementById('close-sidenav-btn');
  const sidenav = document.getElementById('sidenav');
  const backdrop = document.getElementById('sidenav-backdrop');
  const userPill = document.getElementById('header-user-pill');
  
  const authForm = document.getElementById('auth-form');
  const authToggleBtn = document.getElementById('auth-toggle-btn');
  const authToggleTxt = document.getElementById('auth-toggle-txt');
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  const signupFields = document.getElementById('signup-fields');
  
  const logoutBtn = document.getElementById('logout-btn');


  // Modal triggers
  const createGroupTrigger = document.getElementById('create-group-trigger');
  const joinGroupTrigger = document.getElementById('join-group-trigger');

  // Modals
  const createGroupModal = document.getElementById('create-group-modal');
  const joinGroupModal = document.getElementById('join-group-modal');
  const addObjectModal = document.getElementById('add-object-modal');

  // Forms
  const createGroupForm = document.getElementById('create-group-form');
  const joinGroupForm = document.getElementById('join-group-form');
  const addObjectForm = document.getElementById('add-object-form');

  // Modal Cancel Buttons (delegate to each dialog's own close-modal-btn)
  document.addEventListener('click', (e) => {
    if (e.target.closest('.close-modal-btn')) {
      haptics.impact('light');
      e.target.closest('dialog').close();
    }
  });

  // --- Language Toggle Actions ---
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      haptics.impact('light');
      setLanguage(lang);
      if (uiCallbacks.onLanguageChange) {
        uiCallbacks.onLanguageChange(lang);
      }
    });
  });

  // --- Sidenav Interactions ---
  const openSidenav = () => {
    haptics.impact('medium');
    sidenav.classList.add('active');
    sidenav.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('active');
  };

  const closeSidenav = () => {
    haptics.impact('light');
    sidenav.classList.remove('active');
    sidenav.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('active');
  };

  toggleSidenavBtn.addEventListener('click', openSidenav);
  if (userPill) {
    userPill.addEventListener('click', openSidenav);
  }
  closeSidenavBtn.addEventListener('click', closeSidenav);
  backdrop.addEventListener('click', closeSidenav);

  // --- Auth Dialog Actions ---
  const authCard = document.querySelector('.auth-card');
  const goToEmailBtn = document.getElementById('go-to-email-btn');
  const authBackBtn = document.getElementById('auth-back-btn');

  goToEmailBtn.addEventListener('click', () => {
    haptics.impact('light');
    authCard.classList.remove('show-screen-1');
    authCard.classList.add('show-screen-2');
  });

  authBackBtn.addEventListener('click', () => {
    haptics.impact('light');
    authCard.classList.remove('show-screen-2');
    authCard.classList.add('show-screen-1');
  });

  authToggleBtn.addEventListener('click', () => {
    haptics.impact('light');
    setSignUpMode(!isSignUpMode);
    // Transition to credentials input panel when toggle is clicked from methods selection screen
    authCard.classList.remove('show-screen-1');
    authCard.classList.add('show-screen-2');
  });

  // Avatar pickers inside signup form
  const avatarOptions = document.querySelectorAll('.avatar-option');
  avatarOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      haptics.impact('light');
      avatarOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      document.getElementById('auth-avatar-seed').value = opt.dataset.seed;
    });
  });

  // Auth Submit Action
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    haptics.impact('medium');

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (isSignUpMode) {
      const username = document.getElementById('auth-username').value;
      const avatarSeed = document.getElementById('auth-avatar-seed').value;
      await uiCallbacks.onRegister(email, password, username, avatarSeed);
    } else {
      await uiCallbacks.onLogin(email, password);
    }
  });

  // --- Social Logins ---
  const googleLoginBtn = document.getElementById('google-login-btn');
  const appleLoginBtn = document.getElementById('apple-login-btn');

  // Show Apple login only on iOS
  const isIOS = Capacitor.getPlatform() === 'ios';
  if (isIOS) {
    appleLoginBtn.classList.remove('hidden');
  } else {
    appleLoginBtn.classList.add('hidden');
  }

  googleLoginBtn.addEventListener('click', async () => {
    if (uiCallbacks.onSocialLogin) {
      await uiCallbacks.onSocialLogin('google');
    }
  });

  appleLoginBtn.addEventListener('click', async () => {
    if (uiCallbacks.onSocialLogin) {
      await uiCallbacks.onSocialLogin('apple');
    }
  });

  // Logout Click
  logoutBtn.addEventListener('click', () => {
    console.log('[UI] Logout button clicked.');
    haptics.notification('warning');
    closeSidenav();
    if (uiCallbacks.onLogout) {
      console.log('[UI] Triggering onLogout callback.');
      uiCallbacks.onLogout();
    } else {
      console.error('[UI] onLogout callback is not registered!');
    }
  });

  // --- Modals Triggers ---
  createGroupTrigger.addEventListener('click', () => {
    haptics.impact('light');
    createGroupModal.showModal();
  });

  joinGroupTrigger.addEventListener('click', () => {
    haptics.impact('light');
    joinGroupModal.showModal();
  });

  // Emoji picker grid bindings inside Add Object dialog
  const emojiOptions = document.querySelectorAll('.emoji-option');
  emojiOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      haptics.impact('light');
      emojiOptions.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      document.getElementById('add-object-icon').value = opt.dataset.emoji;
    });
  });

  // --- Form Submissions ---
  createGroupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    haptics.impact('medium');
    const name = document.getElementById('new-group-name').value;
    createGroupModal.close();
    createGroupForm.reset();
    await uiCallbacks.onCreateGroup(name);
  });

  joinGroupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    haptics.impact('medium');
    const code = document.getElementById('join-group-id').value;
    joinGroupModal.close();
    joinGroupForm.reset();
    await uiCallbacks.onJoinGroup(code);
  });

  addObjectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    haptics.impact('medium');
    const name = document.getElementById('add-object-name').value;
    const groupId = document.getElementById('add-object-group-select').value;
    const icon = document.getElementById('add-object-icon').value;
    const bleDevice = getBleValue('add-object-ble-device-select', 'add-object-ble-device');

    addObjectModal.close();
    addObjectForm.reset();
    
    // Reset Emoji Picker Selection
    emojiOptions.forEach(o => o.classList.remove('selected'));
    document.querySelector('.emoji-option[data-emoji="🚗"]').classList.add('selected');
    document.getElementById('add-object-icon').value = '🚗';

    await uiCallbacks.onAddObject(name, groupId, icon, bleDevice);
  });



  // Pair BLE Device Form
  const pairDeviceForm = document.getElementById('pair-device-form');
  const pairDeviceModal = document.getElementById('pair-device-modal');

  pairDeviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    haptics.impact('medium');
    const objectId = document.getElementById('pair-device-object-id').value;
    const bleId = getBleValue('pair-device-ble-select', 'pair-device-ble-id');
    pairDeviceModal.close();
    pairDeviceForm.reset();
    await uiCallbacks.onPairDevice(objectId, bleId);
  });

  // --- Group Manage Modal ---
  const groupManageModal = document.getElementById('group-manage-modal');
  const gmSettingsPanel = document.getElementById('gm-settings-panel');
  const gmInvitePanel = document.getElementById('gm-invite-panel');

  let _activeGroupId = null; // tracks which group the manage modal is open for

  // Helper: hide sub-panels (show only the action grid)
  const resetManagePanels = () => {
    gmSettingsPanel.classList.add('hidden');
    gmInvitePanel.classList.add('hidden');
  };

  // Reset panels whenever modal closes
  groupManageModal.addEventListener('close', resetManagePanels);

  // "Add Vehicle" quick action
  document.getElementById('gm-add-vehicle-btn').addEventListener('click', () => {
    haptics.impact('light');
    groupManageModal.close();
    const groupSelect = document.getElementById('add-object-group-select');
    if (groupSelect && _activeGroupId) {
      groupSelect.value = _activeGroupId;
    }
    // Initialise the BLE selector fresh whenever the modal is opened
    initBleSelector({
      selectId:      'add-object-ble-device-select',
      scanBtnId:     'add-object-ble-scan-btn',
      manualRowId:   'add-object-ble-manual-row',
      manualInputId: 'add-object-ble-device',
      currentValue:  '',
    });
    document.getElementById('add-object-modal').showModal();
  });

  // "Group Settings" quick action — toggle inline panel
  document.getElementById('gm-settings-btn').addEventListener('click', () => {
    haptics.impact('light');
    const isOpen = !gmSettingsPanel.classList.contains('hidden');
    resetManagePanels();
    if (!isOpen) {
      gmSettingsPanel.classList.remove('hidden');
      document.getElementById('gm-group-name-input').focus();
    }
  });

  // Settings cancel
  document.getElementById('gm-settings-cancel-btn').addEventListener('click', () => {
    haptics.impact('light');
    resetManagePanels();
  });

  // Settings save
  document.getElementById('gm-settings-save-btn').addEventListener('click', async () => {
    haptics.impact('medium');
    const newName = document.getElementById('gm-group-name-input').value.trim();
    if (!newName) return;
    groupManageModal.close();
    if (uiCallbacks.onRenameGroup) {
      await uiCallbacks.onRenameGroup(_activeGroupId, newName);
    }
  });

  // "Create Invite" quick action — show the invite code
  document.getElementById('gm-invite-btn').addEventListener('click', () => {
    haptics.impact('light');
    const isOpen = !gmInvitePanel.classList.contains('hidden');
    resetManagePanels();
    if (!isOpen) {
      // The invite code IS the group ID (used to join)
      document.getElementById('gm-invite-code').textContent = _activeGroupId || '—';
      gmInvitePanel.classList.remove('hidden');
    }
  });

  // Copy invite code
  document.getElementById('gm-copy-invite-btn').addEventListener('click', () => {
    haptics.notification('success');
    const code = document.getElementById('gm-invite-code').textContent;
    navigator.clipboard.writeText(code).catch(() => {});
    showToast(t('gm_copied_toast'), 'success');
  });

  // --- Leave Group Confirmation Modal ---
  const leaveGroupModal = document.getElementById('leave-group-modal');
  let _leaveGroupId = null;

  document.getElementById('leave-group-confirm-btn').addEventListener('click', async () => {
    haptics.notification('warning');
    leaveGroupModal.close();
    if (_leaveGroupId && uiCallbacks.onLeaveGroup) {
      await uiCallbacks.onLeaveGroup(_leaveGroupId);
    }
    _leaveGroupId = null;
  });

  // Export helpers so updateGroupsUI can open the modals
  uiCallbacks._openManageModal = (groupId, groupName) => {
    _activeGroupId = groupId;
    document.getElementById('group-manage-name').textContent = groupName;
    document.getElementById('gm-group-name-input').value = groupName;
    resetManagePanels();
    groupManageModal.showModal();
  };

  uiCallbacks._openLeaveModal = (groupId, groupName) => {
    _leaveGroupId = groupId;
    document.getElementById('leave-group-modal-text').textContent = t('confirm_leave_group', { name: groupName });
    leaveGroupModal.showModal();
  };
}

/**
 * Toggles Auth screen visibility.
 */
export function showAuthOverlay(show) {
  const overlay = document.getElementById('auth-overlay');
  const headerContainer = document.getElementById('app-header-container');
  const authCard = document.querySelector('.auth-card');

  if (show) {
    if (authCard) {
      authCard.classList.add('show-screen-1');
      authCard.classList.remove('show-screen-2');
    }
    setSignUpMode(false); // Reset to Sign In (login) mode by default

    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    if (headerContainer) headerContainer.style.display = 'none';
  } else {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    if (headerContainer) headerContainer.style.display = 'flex';
    // Clear inputs
    document.getElementById('auth-form').reset();
  }
}



/**
 * Updates User profile info in top header bar & sidenav.
 */
export function updateProfileUI(profile) {
  const usernameHeader = document.getElementById('header-username');
  const avatarHeader = document.getElementById('header-avatar');
  const usernameSidenav = document.getElementById('sidenav-username');
  const avatarSidenav = document.getElementById('sidenav-avatar');

  if (profile) {
    if (usernameHeader) usernameHeader.textContent = profile.username;
    if (avatarHeader) avatarHeader.src = profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`;
    usernameSidenav.textContent = profile.username;
    avatarSidenav.src = profile.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${profile.username}`;
  } else {
    if (usernameHeader) usernameHeader.textContent = t('signin_btn');
    if (avatarHeader) avatarHeader.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=placeholder';
    usernameSidenav.textContent = t('guest');
    avatarSidenav.src = 'https://api.dicebear.com/7.x/bottts/svg?seed=placeholder';
  }
}

/**
 * Renders the Groups accordion & populated object targets inside the Sidenav.
 */
export function updateGroupsUI(groups, objects, pairedDevicesMap = {}) {
  const groupsListContainer = document.getElementById('groups-list');
  const groupSelect = document.getElementById('add-object-group-select');

  // Reset Sidenav contents
  groupsListContainer.innerHTML = '';
  groupSelect.innerHTML = '';

  if (groups.length === 0) {
    groupsListContainer.innerHTML = `<p class="empty-state">${t('no_groups')}</p>`;
    return;
  }

  // Populate Add Object Group Selector
  groups.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    groupSelect.appendChild(opt);
  });

  // Build Accordion cards for each Group
  groups.forEach(group => {
    const groupObjects = objects.filter(o => o.group_id === group.id);
    const isOpen = openAccordions.has(group.id);

    const groupCard = document.createElement('div');
    groupCard.className = `group-card ${isOpen ? 'open' : ''}`;
    groupCard.id = `group-card-${group.id}`;

    // Header Row (Click to toggle accordion)
    const header = document.createElement('div');
    header.className = 'group-card-header';
    header.innerHTML = `
      <div class="group-card-title">
        <span>👥</span>
        <span>${group.name}</span>
      </div>
      <div class="group-arrow">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
    `;

    header.addEventListener('click', () => {
      haptics.impact('light');
      if (groupCard.classList.contains('open')) {
        groupCard.classList.remove('open');
        openAccordions.delete(group.id);
      } else {
        groupCard.classList.add('open');
        openAccordions.add(group.id);
      }
    });

    // Body Row (Objects list & actions)
    const body = document.createElement('div');
    body.className = 'group-card-body';

    const listDiv = document.createElement('div');
    listDiv.className = 'objects-list';

    if (groupObjects.length === 0) {
      listDiv.innerHTML = `<p class="empty-state" style="padding:15px; font-size:0.8rem;">${t('no_vehicles')}</p>`;
    } else {
      groupObjects.forEach(obj => {
        const pairedBleId = pairedDevicesMap[obj.id] || '';
        const item = document.createElement('div');
        item.className = 'object-item';
        
        const infoSubtext = pairedBleId ? `
          <div style="font-size:0.7rem; color:var(--text-secondary); font-weight:normal;">${t('ble_prefix')}<strong>${pairedBleId}</strong></div>
        ` : `
          <div style="font-size:0.7rem; color:var(--text-muted); font-style:italic; font-weight:normal;">${t('no_ble')}</div>
        `;
        const simulateBtnHtml = pairedBleId ? `
          <!-- Simulate BLE Disconnect Button -->
          <button class="icon-btn ble-disconnect-btn" style="padding:4px; color:var(--accent);" title="${t('simulate_tooltip')}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7 7 10 10-5 5V2l5 5L7 17"></path></svg>
          </button>
        ` : '';

        const bleIconColor = pairedBleId ? 'var(--success)' : 'var(--text-muted)';
        const bleIconTitle = pairedBleId ? t('pair_change_tooltip', { device: pairedBleId }) : t('pair_tooltip');

        item.innerHTML = `
          <div class="object-info">
            <span class="object-icon">${obj.icon || '🚗'}</span>
            <div style="display:flex; flex-direction:column;">
              <span class="object-name" style="line-height:1.2;">${obj.name}</span>
              ${infoSubtext}
            </div>
          </div>
          <div class="object-actions">
            <!-- Locate Button -->
            <button class="icon-btn locate-obj-btn" style="padding:4px;" title="${t('locate_tooltip')}">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line></svg>
            </button>
            <!-- Pair BLE Button -->
            <button class="icon-btn pair-ble-btn" style="padding:4px; color:${bleIconColor};" title="${bleIconTitle}">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 7 10 10-5 5V2l5 5L7 17"></path></svg>
            </button>
            ${simulateBtnHtml}
            <!-- Delete Button -->
            <button class="icon-btn delete-obj-btn" style="padding:4px; color:var(--danger);" title="${t('remove_tooltip')}">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </div>
        `;

        // Locate Button Action
        item.querySelector('.locate-obj-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          haptics.impact('light');
          if (obj.last_latitude && obj.last_longitude) {
            uiCallbacks.onLocateObject(parseFloat(obj.last_latitude), parseFloat(obj.last_longitude));
            // Close Sidenav automatically on mobile to see the map
            document.getElementById('sidenav').classList.remove('active');
            document.getElementById('sidenav-backdrop').classList.remove('active');
          } else {
            showToast(t('toast_no_coordinates', { name: obj.name }), 'warning');
          }
        });

        // Pair BLE Action
        item.querySelector('.pair-ble-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          haptics.impact('light');
          document.getElementById('pair-device-object-id').value = obj.id;
          // Re-initialise the BLE selector with the current paired value each time the modal opens
          initBleSelector({
            selectId:      'pair-device-ble-select',
            scanBtnId:     'pair-device-ble-scan-btn',
            manualRowId:   'pair-device-ble-manual-row',
            manualInputId: 'pair-device-ble-id',
            currentValue:  pairedBleId,
          });
          document.getElementById('pair-device-modal').showModal();
        });

        // Simulate BLE Disconnect Action (if exists)
        const disconnectBtn = item.querySelector('.ble-disconnect-btn');
        if (disconnectBtn) {
          disconnectBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            haptics.notification('warning');
            uiCallbacks.onSimulateBleDisconnect(pairedBleId, obj.id);
          });
        }

        // Delete Button Action
        item.querySelector('.delete-obj-btn').addEventListener('click', async (e) => {
          e.stopPropagation();
          haptics.notification('warning');
          if (confirm(t('confirm_delete_vehicle', { name: obj.name }))) {
            await uiCallbacks.onDeleteObject(obj.id);
          }
        });

        listDiv.appendChild(item);
      });
    }

    body.appendChild(listDiv);

    // Group header icon-action row (manage + leave)
    const actionsRow = document.createElement('div');
    actionsRow.className = 'group-actions-row';
    actionsRow.innerHTML = `
      <button class="btn btn-pill-sm group-manage-btn" title="${t('manage_group_tooltip') || 'Manage Group'}" style="display:flex;align-items:center;gap:5px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        ${t('manage_group_btn') || 'Manage'}
      </button>
      <button class="icon-btn leave-group-btn" title="${t('leave_group')}" style="color:var(--danger); padding:4px; border-radius:50%;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
      </button>
    `;

    actionsRow.querySelector('.group-manage-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      haptics.impact('light');
      // Initialise the BLE selector fresh (no pre-selected value) when adding a new vehicle
      initBleSelector({
        selectId:      'add-object-ble-device-select',
        scanBtnId:     'add-object-ble-scan-btn',
        manualRowId:   'add-object-ble-manual-row',
        manualInputId: 'add-object-ble-device',
        currentValue:  '',
      });
      if (uiCallbacks._openManageModal) {
        uiCallbacks._openManageModal(group.id, group.name);
      }
    });

    actionsRow.querySelector('.leave-group-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      haptics.notification('warning');
      if (uiCallbacks._openLeaveModal) {
        uiCallbacks._openLeaveModal(group.id, group.name);
      }
    });


    body.appendChild(actionsRow);

    groupCard.appendChild(header);
    groupCard.appendChild(body);
    groupsListContainer.appendChild(groupCard);
  });
}

/**
 * Shows a beautiful floating glassmorphic toast notification.
 */
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'glass-panel';
  
  // Custom styling for Toast to look clean and premium
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%) translateY(100px)',
    padding: '12px 20px',
    borderRadius: '30px',
    fontSize: '0.9rem',
    fontWeight: '550',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: '9999',
    transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    boxShadow: 'var(--shadow-sheet)',
    border: '1.5px solid var(--border-glass)',
    backgroundColor: type === 'success' ? 'rgba(230, 248, 240, 0.85)' : 
                     type === 'error' ? 'rgba(255, 235, 235, 0.85)' : 
                     type === 'warning' ? 'rgba(255, 248, 230, 0.85)' : 'rgba(255,255,255,0.85)',
    color: type === 'success' ? 'var(--success)' : 
           type === 'error' ? 'var(--danger)' : 'var(--text-main)'
  });

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  
  document.body.appendChild(toast);

  // Trigger Slide Up
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }, 50);

  // Trigger Slide Down & Remove
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}
