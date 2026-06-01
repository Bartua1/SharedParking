// Internationalization (i18n) Module for SharedParking

const translations = {
  en: {
    // Header
    "loading": "Loading...",
    "logo_title": "SharedParking",
    "open_menu": "Open Menu",
    "close_menu": "Close Menu",
    
    // Sidenav
    "my_space": "My Space",
    "guest": "Guest",
    "active_driver": "Active Driver",
    "log_out": "Log Out",
    "shared_groups": "Shared Groups",
    "join_btn": "+ Join",
    "no_groups": "No groups joined yet. Create or join a group to start tracking.",
    "create_group_btn": "Create New Group",
    "register_vehicle_btn": "Register New Vehicle",
    "language_label": "Language:",
    
    // Auth Overlay
    "welcome_title": "Welcome to SharedParking",
    "welcome_subtitle": "Auto-track vehicle locations with your group",
    "email_label": "Email Address",
    "password_label": "Password",
    "username_label": "Username",
    "avatar_label": "Choose Avatar Style",
    "signin_btn": "Sign In",
    "signup_btn": "Sign Up",
    "no_account": "Don't have an account?",
    "have_account": "Already have an account?",
    "email_placeholder": "name@example.com",
    "password_placeholder": "••••••••",
    "username_placeholder": "johndoe",
    "social_divider_text": "Or continue with",
    "google_signin": "Sign in with Google",
    "apple_signin": "Sign in with Apple",
    

    // Modals
    // Create Group
    "create_group_title": "Create New Group",
    "group_name_label": "Group Name",
    "group_name_placeholder": "e.g., Family Fleet",
    "cancel": "Cancel",
    "create": "Create",
    // Join Group
    "join_group_title": "Join Existing Group",
    "invite_code_label": "Group Invite Code (ID)",
    "invite_code_placeholder": "Paste group ID here",
    "join": "Join",
    // Register Vehicle
    "register_vehicle_title": "Register New Vehicle",
    "vehicle_name_label": "Vehicle/Object Name",
    "vehicle_name_placeholder": "e.g., Mom's SUV",
    "select_group_label": "Select Group",
    "select_icon_label": "Select Icon",
    "ble_device_label": "Bluetooth LE Device",
    "ble_device_placeholder": "e.g., OBD-II_Beacon_45A1",
    "ble_device_help": "When this device disconnects, location updates will trigger.",
    "ble_scan_btn": "Scan",
    "ble_scanning": "Scanning...",
    "ble_no_devices": "No devices found",
    "ble_select_placeholder": "-- Select a device --",
    "ble_manual_entry": "✏️ Enter manually...",
    "ble_scan_error": "Scan failed. Enter device ID manually.",
    "register": "Register",
    // Pair BLE
    "pair_device_title": "Associate Bluetooth Device",
    "pair_device_desc": "Define the Bluetooth LE MAC address or UUID that represents your connection to this vehicle on your phone.",
    "pair_device_label": "Bluetooth LE Device ID / MAC",
    "save_pairing": "Save Pairing",
    
    // Dynamic / JavaScript UI text
    "no_vehicles": "No vehicles registered.",
    "leave_group": "Leave Group",
    "ble_prefix": "BLE: ",
    "no_ble": "No BLE Paired",
    "locate_tooltip": "Focus vehicle on Map",
    "pair_tooltip": "Pair Bluetooth Device",
    "pair_change_tooltip": "Paired device: {device} (Click to change)",
    "simulate_tooltip": "Simulate BLE Disconnect",
    "remove_tooltip": "Remove vehicle",
    
    // Alerts and Toasts

    "toast_connecting": "⚡ Connecting to map & GPS...",
    "toast_signin_success": "Signed in successfully!",
    "toast_register_success": "Registration successful! Please check your inbox and confirm your email.",
    "toast_logout_success": "Logged out.",
    "toast_logout_failed": "Logout failed.",
    "toast_create_group_success": "Created group \"{name}\"!",
    "toast_create_group_error": "Failed to create group.",
    "toast_group_not_found": "Group not found. Verify the invite code/ID.",
    "toast_already_member": "You are already a member of this group.",
    "toast_join_group_success": "Joined group \"{name}\"!",
    "toast_join_group_error": "Failed to join group.",
    "toast_leave_group_success": "Left group successfully.",
    "toast_leave_group_error": "Failed to leave group.",
    "toast_register_vehicle_success": "Registered \"{name}\"!",
    "toast_register_vehicle_error": "Failed to register vehicle.",
    "toast_ble_removed": "Bluetooth pairing removed.",
    "toast_ble_associated": "Bluetooth device associated successfully!",
    "toast_ble_pair_error": "Failed to save device pairing.",
    "toast_vehicle_deleted": "Vehicle deleted.",
    "toast_vehicle_delete_error": "Failed to delete vehicle.",
    "toast_auto_logged": "📍 Auto-logged parking spot for \"{name}\"!",
    "toast_auto_logged_error": "Failed to auto-update vehicle location.",
    "toast_simulating_disconnect": "📡 Simulating BLE disconnect for \"{name}\"...",
    "toast_no_coordinates": "⚠️ \"{name}\" has no registered coordinates yet!",
    "confirm_delete_vehicle": "Are you sure you want to delete the vehicle \"{name}\"?",
    "confirm_leave_group": "Leave group \"{name}\"? You will lose access to its tracked vehicles.",
    "toast_sync_error": "Failed to synchronise data with server.",
    "bot_avatar_name": "🤖 bot{num}",
    
    "map_coords": "Coords",
    "map_never": "Never",
    "system_user": "System",
    "unknown_group": "Unknown Group",

    // Group Manage Modal
    "manage_group_btn": "Manage",
    "manage_group_tooltip": "Manage Group",
    "gm_add_vehicle": "Add Vehicle",
    "gm_group_settings": "Group Settings",
    "gm_create_invite": "Create Invite",
    "gm_invite_code_label": "Group Invite Code",
    "gm_copy_code": "Copy Code",
    "gm_copied_toast": "Invite code copied!",
    "save": "Save",
    // Leave Group Modal
    "leave_group_confirm_title": "Leave Group?"
  },
  es: {
    // Header
    "loading": "Cargando...",
    "logo_title": "SharedParking",
    "open_menu": "Abrir menú",
    "close_menu": "Cerrar menú",
    
    // Sidenav
    "my_space": "Mi Espacio",
    "guest": "Invitado",
    "active_driver": "Conductor Activo",
    "log_out": "Cerrar Sesión",
    "shared_groups": "Grupos Compartidos",
    "join_btn": "+ Unirse",
    "no_groups": "Aún no te has unido a ningún grupo. Crea o únete a un grupo para empezar.",
    "create_group_btn": "Crear Nuevo Grupo",
    "register_vehicle_btn": "Registrar Vehículo",
    "language_label": "Idioma:",
    
    // Auth Overlay
    "welcome_title": "Bienvenido a SharedParking",
    "welcome_subtitle": "Registra automáticamente la ubicación del vehículo con tu grupo",
    "email_label": "Dirección de Correo",
    "password_label": "Contraseña",
    "username_label": "Nombre de usuario",
    "avatar_label": "Elige estilo de avatar",
    "signin_btn": "Iniciar Sesión",
    "signup_btn": "Registrarse",
    "no_account": "¿No tienes una cuenta?",
    "have_account": "¿Ya tienes una cuenta?",
    "email_placeholder": "nombre@ejemplo.com",
    "password_placeholder": "••••••••",
    "username_placeholder": "usuario",
    "social_divider_text": "O continuar con",
    "google_signin": "Iniciar sesión con Google",
    "apple_signin": "Iniciar sesión con Apple",
    

    // Modals
    // Create Group
    "create_group_title": "Crear Nuevo Grupo",
    "group_name_label": "Nombre del Grupo",
    "group_name_placeholder": "ej. Flota Familiar",
    "cancel": "Cancelar",
    "create": "Crear",
    // Join Group
    "join_group_title": "Unirse a Grupo Existente",
    "invite_code_label": "Código de Invitación (ID)",
    "invite_code_placeholder": "Pega el ID del grupo aquí",
    "join": "Unirse",
    // Register Vehicle
    "register_vehicle_title": "Registrar Vehículo",
    "vehicle_name_label": "Nombre del Vehículo/Objeto",
    "vehicle_name_placeholder": "ej. SUV de Mamá",
    "select_group_label": "Seleccionar Grupo",
    "select_icon_label": "Seleccionar Icono",
    "ble_device_label": "Dispositivo Bluetooth LE",
    "ble_device_placeholder": "ej. OBD-II_Beacon_45A1",
    "ble_device_help": "Cuando este dispositivo se desconecte, se actualizará la ubicación.",
    "ble_scan_btn": "Escanear",
    "ble_scanning": "Escaneando...",
    "ble_no_devices": "No se encontraron dispositivos",
    "ble_select_placeholder": "-- Selecciona un dispositivo --",
    "ble_manual_entry": "✏️ Ingresar manualmente...",
    "ble_scan_error": "Escaneo fallido. Ingresa el ID del dispositivo manualmente.",
    "register": "Registrar",
    // Pair BLE
    "pair_device_title": "Asociar Dispositivo Bluetooth",
    "pair_device_desc": "Define la dirección MAC o UUID de Bluetooth LE que representa tu conexión a este vehículo en tu teléfono.",
    "pair_device_label": "ID / MAC de Dispositivo Bluetooth LE",
    "save_pairing": "Guardar Asociación",
    
    // Dynamic / JavaScript UI text
    "no_vehicles": "No hay vehículos registrados.",
    "leave_group": "Salir del Grupo",
    "ble_prefix": "BLE: ",
    "no_ble": "Sin BLE Asociado",
    "locate_tooltip": "Enfocar vehículo en el mapa",
    "pair_tooltip": "Asociar Dispositivo Bluetooth",
    "pair_change_tooltip": "Dispositivo asociado: {device} (Click para cambiar)",
    "simulate_tooltip": "Simular desconexión BLE",
    "remove_tooltip": "Eliminar vehículo",
    
    // Alerts and Toasts

    "toast_connecting": "⚡ Conectando al mapa y GPS...",
    "toast_signin_success": "¡Sesión iniciada con éxito!",
    "toast_register_success": "¡Registro exitoso! Por favor, revisa tu bandeja de entrada y confirma tu correo.",
    "toast_logout_success": "Sesión cerrada.",
    "toast_logout_failed": "Error al cerrar sesión.",
    "toast_create_group_success": "¡Grupo \"{name}\" creado!",
    "toast_create_group_error": "Error al crear el grupo.",
    "toast_group_not_found": "Grupo no encontrado. Verifica el código/ID de invitación.",
    "toast_already_member": "Ya eres miembro de este grupo.",
    "toast_join_group_success": "¡Te has unido al grupo \"{name}\"!",
    "toast_join_group_error": "Error al unirse al grupo.",
    "toast_leave_group_success": "Saliste del grupo con éxito.",
    "toast_leave_group_error": "Error al salir del grupo.",
    "toast_register_vehicle_success": "¡Registrado \"{name}\"!",
    "toast_register_vehicle_error": "Error al registrar el vehículo.",
    "toast_ble_removed": "Asociación Bluetooth eliminada.",
    "toast_ble_associated": "¡Dispositivo Bluetooth asociado con éxito!",
    "toast_ble_pair_error": "Error al guardar la asociación del dispositivo.",
    "toast_vehicle_deleted": "Vehículo eliminado.",
    "toast_vehicle_delete_error": "Error al eliminar el vehículo.",
    "toast_auto_logged": "📍 ¡Ubicación de estacionamiento registrada automáticamente para \"{name}\"!",
    "toast_auto_logged_error": "Error al actualizar automáticamente la ubicación del vehículo.",
    "toast_simulating_disconnect": "📡 Simulando desconexión BLE para \"{name}\"...",
    "toast_no_coordinates": "⚠️ ¡\"{name}\" aún no tiene coordenadas registradas!",
    "confirm_delete_vehicle": "¿Estás seguro de que deseas eliminar el vehículo \"{name}\"?",
    "confirm_leave_group": "¿Salir del grupo \"{name}\"? Perderás acceso a sus vehículos registrados.",
    "toast_sync_error": "Error al sincronizar los datos con el servidor.",
    "bot_avatar_name": "🤖 bot{num}",
    
    "map_coords": "Coordenadas",
    "map_never": "Nunca",
    "system_user": "Sistema",
    "unknown_group": "Grupo desconocido",

    // Group Manage Modal
    "manage_group_btn": "Gestionar",
    "manage_group_tooltip": "Gestionar Grupo",
    "gm_add_vehicle": "Añadir Vehículo",
    "gm_group_settings": "Ajustes del Grupo",
    "gm_create_invite": "Crear Invitación",
    "gm_invite_code_label": "Código de Invitación",
    "gm_copy_code": "Copiar Código",
    "gm_copied_toast": "¡Código copiado!",
    "save": "Guardar",
    // Leave Group Modal
    "leave_group_confirm_title": "¿Salir del Grupo?"
  }
};

const STORAGE_KEY = 'shared_parking_lang';

/**
 * Returns the current active language code ('en' or 'es').
 */
export function getCurrentLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && (saved === 'en' || saved === 'es')) {
    return saved;
  }
  
  // Fallback to browser preference array (navigator.languages)
  if (navigator.languages && navigator.languages.length) {
    for (const lang of navigator.languages) {
      if (lang.startsWith('es')) {
        return 'es';
      }
      if (lang.startsWith('en')) {
        return 'en';
      }
    }
  }

  // Fallback to single browser preference properties
  const browserLang = navigator.language || navigator.userLanguage || navigator.browserLanguage;
  if (browserLang) {
    if (browserLang.startsWith('es')) {
      return 'es';
    }
  }
  
  return 'en';
}

/**
 * Updates the active language code in localStorage, updates switcher button states, and translates the DOM.
 * @param {string} lang - Language code ('en' or 'es')
 */
export function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'es') return;
  localStorage.setItem(STORAGE_KEY, lang);
  
  // Update HTML lang attribute
  document.documentElement.setAttribute('lang', lang);
  
  // Update class active states on language button group
  document.querySelectorAll('.lang-btn').forEach(btn => {
    if (btn.dataset.lang === lang) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
  
  // Translate the static DOM contents
  translateDOM();
}

/**
 * Resolves a key to its translation in the active language, substituting any variables.
 * @param {string} key - Translation key
 * @param {Object} variables - Map of values to substitute in placeholders (e.g. {name})
 */
export function t(key, variables = {}) {
  const lang = getCurrentLanguage();
  let text = translations[lang]?.[key] || translations['en']?.[key] || key;
  
  Object.keys(variables).forEach(varKey => {
    text = text.replace(new RegExp(`\\{${varKey}\\}`, 'g'), variables[varKey]);
  });
  
  return text;
}

/**
 * Scans the DOM and applies translations dynamically based on i18n data-attributes.
 */
export function translateDOM() {
  // Translate innerText / textContent
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (text) {
      el.textContent = text;
    }
  });

  // Translate input placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const text = t(key);
    if (text) {
      el.setAttribute('placeholder', text);
    }
  });

  // Translate tooltip titles
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const text = t(key);
    if (text) {
      el.setAttribute('title', text);
    }
  });

  // Translate accessible descriptions (aria-label)
  document.querySelectorAll('[data-i18n-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-label');
    const text = t(key);
    if (text) {
      el.setAttribute('aria-label', text);
    }
  });
}
