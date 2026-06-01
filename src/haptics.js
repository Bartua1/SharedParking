import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * Haptics integration wrapper.
 * Safely calls Capacitor Haptics plugin when running on native platforms (iOS/Android).
 * No fallbacks or mocks are executed on desktop/web environments.
 */
class HapticsController {
  constructor() {
    this.isNative = typeof window !== 'undefined' && 
                    Capacitor.isNativePlatform() && 
                    Capacitor.isPluginAvailable('Haptics');
  }

  /**
   * Trigger haptic feedback for physical button clicks or item select.
   * @param {'light'|'medium'|'heavy'} style - Impact intensity
   */
  async impact(style = 'light') {
    try {
      if (this.isNative) {
        let nativeStyle = ImpactStyle.Light;
        if (style === 'medium') nativeStyle = ImpactStyle.Medium;
        if (style === 'heavy') nativeStyle = ImpactStyle.Heavy;
        await Haptics.impact({ style: nativeStyle });
      }
    } catch (e) {
      console.warn('Haptics impact error', e);
    }
  }

  /**
   * Trigger success, warning, or error haptic notification.
   * @param {'success'|'warning'|'error'} type - Notification type
   */
  async notification(type = 'success') {
    try {
      if (this.isNative) {
        let nativeType = NotificationType.Success;
        if (type === 'warning') nativeType = NotificationType.Warning;
        if (type === 'error') nativeType = NotificationType.Error;
        await Haptics.notification({ type: nativeType });
      }
    } catch (e) {
      console.warn('Haptics notification error', e);
    }
  }

  /**
   * Trigger custom selection change vibration (subtle tick).
   */
  async selectionStart() {
    try {
      if (this.isNative) {
        await Haptics.selectionStart();
      }
    } catch (e) {
      console.warn('Haptics selectionStart error', e);
    }
  }

  async selectionChanged() {
    try {
      if (this.isNative) {
        await Haptics.selectionChanged();
      }
    } catch (e) {
      console.warn('Haptics selectionChanged error', e);
    }
  }

  async selectionEnd() {
    try {
      if (this.isNative) {
        await Haptics.selectionEnd();
      }
    } catch (e) {
      console.warn('Haptics selectionEnd error', e);
    }
  }
}

export const haptics = new HapticsController();

