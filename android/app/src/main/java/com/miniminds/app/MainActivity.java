package com.miniminds.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // White status bar with dark icons
        Window window = getWindow();
        window.setStatusBarColor(Color.WHITE);
        window.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);

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
