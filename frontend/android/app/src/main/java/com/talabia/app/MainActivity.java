package com.talabia.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebStorage;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Handle the splash screen transition correctly for API 31+
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);

        // 🛡️ Nuclear Ghost-Busters: Pure Slate Scrub
        try {
            // 1. Wipe all Cookies (Forces logout and cache break)
            CookieManager.getInstance().removeAllCookies(null);
            CookieManager.getInstance().flush();

            // 2. Wipe all WebStorage (LocalStorage, IndexedDB, etc.)
            WebStorage.getInstance().deleteAllData();

            // 3. Clear WebView Cache (Files, CSS, JS)
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.clearCache(true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
