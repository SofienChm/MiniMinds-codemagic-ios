import { Injectable } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class StatusBarService {
  private isNative = Capacitor.isNativePlatform();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize status bar with default settings
   */
  async initialize(): Promise<void> {
    if (!this.isNative) return;

    // Only run on iOS - Android is handled in MainActivity.java
    const isIOS = Capacitor.getPlatform() === 'ios';
    if (!isIOS) return;

    try {
      await this.setStyle('dark'); // Dark icons on light background
    } catch (error) {
      console.warn('StatusBar initialization failed:', error);
    }
  }

  /**
   * Set status bar background color
   * @param color Hex color string (e.g., '#ffffff', '#7dd3c0')
   */
  async setBackgroundColor(color: string): Promise<void> {
    if (!this.isNative) return;

    try {
      await StatusBar.setBackgroundColor({ color });
    } catch (error) {
      console.warn('Failed to set status bar color:', error);
    }
  }

  /**
   * Set status bar style
   * @param style 'dark' = black icons (for light backgrounds), 'light' = white icons (for dark backgrounds)
   */
  async setStyle(style: 'dark' | 'light'): Promise<void> {
    if (!this.isNative) return;

    try {
      await StatusBar.setStyle({
        style: style === 'dark' ? Style.Dark : Style.Light
      });
    } catch (error) {
      console.warn('Failed to set status bar style:', error);
    }
  }

  /**
   * Set status bar for light background (black icons)
   */
  async setForLightBackground(): Promise<void> {
    await this.setStyle('dark');
  }

  /**
   * Set status bar for dark background (white icons)
   */
  async setForDarkBackground(): Promise<void> {
    await this.setStyle('light');
  }

  /**
   * Hide the status bar
   */
  async hide(): Promise<void> {
    if (!this.isNative) return;

    try {
      await StatusBar.hide();
    } catch (error) {
      console.warn('Failed to hide status bar:', error);
    }
  }

  /**
   * Show the status bar
   */
  async show(): Promise<void> {
    if (!this.isNative) return;

    try {
      await StatusBar.show();
    } catch (error) {
      console.warn('Failed to show status bar:', error);
    }
  }

  /**
   * Set overlay mode (content goes behind status bar)
   * Only works on Android
   */
  async setOverlay(overlay: boolean): Promise<void> {
    if (!this.isNative) return;

    try {
      await StatusBar.setOverlaysWebView({ overlay });
    } catch (error) {
      console.warn('Failed to set overlay:', error);
    }
  }

  /**
   * Quick preset: White status bar with dark icons
   */
  async setWhiteTheme(): Promise<void> {
    await this.setBackgroundColor('#ffffff');
    await this.setStyle('dark');
  }

  /**
   * Quick preset: Primary color status bar (teal/mint) with white icons
   */
  async setPrimaryTheme(): Promise<void> {
    await this.setBackgroundColor('#7dd3c0');
    await this.setStyle('light');
  }

  /**
   * Quick preset: Dark status bar with white icons
   */
  async setDarkTheme(): Promise<void> {
    await this.setBackgroundColor('#1f2937');
    await this.setStyle('light');
  }

  /**
   * Quick preset: Transparent status bar (Android only)
   */
  async setTransparent(): Promise<void> {
    await this.setBackgroundColor('#00000000');
    await this.setOverlay(true);
  }
}
