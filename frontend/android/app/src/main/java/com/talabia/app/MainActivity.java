package com.talabia.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Handle the splash screen transition correctly for API 31+
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        // ✅ Soft cache refresh: clear in-memory cache only
        // Does NOT delete localStorage, cookies, or session data
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.clearCache(false); // false = in-memory only, preserves disk cache
            }
        } catch (Exception e) {
            // Silent fail — non-critical
        }
    }
}
