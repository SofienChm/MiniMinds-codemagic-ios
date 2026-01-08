import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { saveAs } from 'file-saver';

export interface DownloadResult {
  success: boolean;
  message: string;
  filePath?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageDownloadService {

  /**
   * Download/save an image - works on both web and mobile
   * @param imageData Base64 data URL or URL of the image
   * @param fileName Name for the saved file
   * @returns Promise with download result
   */
  async downloadImage(imageData: string, fileName: string): Promise<DownloadResult> {
    if (Capacitor.isNativePlatform()) {
      return this.saveToDevice(imageData, fileName);
    } else {
      return this.downloadOnWeb(imageData, fileName);
    }
  }

  /**
   * Share an image (mobile only) - allows saving to gallery or sharing
   * @param imageData Base64 data URL
   * @param fileName Name for the file
   * @param title Optional title for share dialog
   */
  async shareImage(imageData: string, fileName: string, title?: string): Promise<DownloadResult> {
    if (!Capacitor.isNativePlatform()) {
      // On web, just download
      return this.downloadOnWeb(imageData, fileName);
    }

    try {
      // First save the file temporarily
      const base64Data = this.extractBase64Data(imageData);
      const mimeType = this.getMimeType(imageData);
      const extension = this.getExtension(mimeType);
      const finalFileName = this.ensureExtension(fileName, extension);

      // Save to cache directory for sharing
      const savedFile = await Filesystem.writeFile({
        path: finalFileName,
        data: base64Data,
        directory: Directory.Cache
      });

      // Get the full URI for sharing
      const fileUri = savedFile.uri;

      // Share the file
      await Share.share({
        title: title || 'Save Image',
        text: title || fileName,
        url: fileUri,
        dialogTitle: 'Save or Share Image'
      });

      return {
        success: true,
        message: 'Image shared successfully',
        filePath: fileUri
      };
    } catch (error: any) {
      console.error('Error sharing image:', error);
      return {
        success: false,
        message: error.message || 'Failed to share image'
      };
    }
  }

  /**
   * Save image to device storage (mobile)
   */
  private async saveToDevice(imageData: string, fileName: string): Promise<DownloadResult> {
    try {
      const base64Data = this.extractBase64Data(imageData);
      const mimeType = this.getMimeType(imageData);
      const extension = this.getExtension(mimeType);
      const finalFileName = this.ensureExtension(fileName, extension);

      // Request permissions first on Android
      if (Capacitor.getPlatform() === 'android') {
        const permResult = await Filesystem.requestPermissions();
        if (permResult.publicStorage !== 'granted') {
          // Try with limited access
          console.warn('Storage permission not fully granted, saving to app directory');
        }
      }

      // Try to save to Documents directory (accessible to user)
      const savedFile = await Filesystem.writeFile({
        path: `MiniMinds/${finalFileName}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });

      return {
        success: true,
        message: `Image saved to Documents/MiniMinds/${finalFileName}`,
        filePath: savedFile.uri
      };
    } catch (error: any) {
      console.error('Error saving to Documents, trying external:', error);

      // Fallback: try saving to external storage on Android
      if (Capacitor.getPlatform() === 'android') {
        try {
          const base64Data = this.extractBase64Data(imageData);
          const mimeType = this.getMimeType(imageData);
          const extension = this.getExtension(mimeType);
          const finalFileName = this.ensureExtension(fileName, extension);

          const savedFile = await Filesystem.writeFile({
            path: `Download/MiniMinds/${finalFileName}`,
            data: base64Data,
            directory: Directory.ExternalStorage,
            recursive: true
          });

          return {
            success: true,
            message: `Image saved to Downloads/MiniMinds/${finalFileName}`,
            filePath: savedFile.uri
          };
        } catch (extError: any) {
          console.error('External storage also failed:', extError);
        }
      }

      // Last resort: use share functionality
      return this.shareImage(imageData, fileName, 'Save Image');
    }
  }

  /**
   * Download image on web browser
   */
  private downloadOnWeb(imageData: string, fileName: string): Promise<DownloadResult> {
    return new Promise((resolve) => {
      try {
        const mimeType = this.getMimeType(imageData);
        const extension = this.getExtension(mimeType);
        const finalFileName = this.ensureExtension(fileName, extension);

        // Convert base64 to blob
        const base64Data = this.extractBase64Data(imageData);
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        // Use file-saver to download
        saveAs(blob, finalFileName);

        resolve({
          success: true,
          message: 'Image downloaded successfully'
        });
      } catch (error: any) {
        console.error('Error downloading image:', error);
        resolve({
          success: false,
          message: error.message || 'Failed to download image'
        });
      }
    });
  }

  /**
   * Extract base64 data from data URL
   */
  private extractBase64Data(dataUrl: string): string {
    if (dataUrl.includes(',')) {
      return dataUrl.split(',')[1];
    }
    return dataUrl;
  }

  /**
   * Get MIME type from data URL
   */
  private getMimeType(dataUrl: string): string {
    if (dataUrl.startsWith('data:')) {
      const match = dataUrl.match(/data:([^;]+);/);
      if (match) {
        return match[1];
      }
    }
    return 'image/jpeg'; // Default
  }

  /**
   * Get file extension from MIME type
   */
  private getExtension(mimeType: string): string {
    const mimeToExt: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/bmp': 'bmp',
      'image/svg+xml': 'svg'
    };
    return mimeToExt[mimeType] || 'jpg';
  }

  /**
   * Ensure filename has the correct extension
   */
  private ensureExtension(fileName: string, extension: string): string {
    const hasExtension = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName);
    if (!hasExtension) {
      return `${fileName}.${extension}`;
    }
    return fileName;
  }

  /**
   * Generate a unique filename with timestamp
   */
  generateFileName(prefix: string = 'image'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${prefix}_${timestamp}`;
  }

  /**
   * Check if running on native platform
   */
  isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Get current platform
   */
  getPlatform(): string {
    return Capacitor.getPlatform();
  }
}
