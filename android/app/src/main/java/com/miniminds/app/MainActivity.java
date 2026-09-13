package com.miniminds.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register custom plugins before calling super.onCreate()
        registerPlugin(SaveToGalleryPlugin.class);

        super.onCreate(savedInstanceState);

        // White status bar with dark icons
        Window window = getWindow();
        window.setStatusBarColor(Color.WHITE);
        
        // Enable edge-to-edge display for Android 10+ (API 29+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarColor(Color.WHITE);
            window.setNavigationBarContrastEnforced(false);
        }
        
        // Set light status bar and navigation bar
        int flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
        window.getDecorView().setSystemUiVisibility(flags);

        // Enable autofill for the WebView (password manager support)
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setSaveFormData(true);
            settings.setSavePassword(true);

            // Enable autofill (Android 8.0+)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                webView.setImportantForAutofill(WebView.IMPORTANT_FOR_AUTOFILL_YES);
            }
        }
    }
}
