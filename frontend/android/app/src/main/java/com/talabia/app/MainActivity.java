package com.talabia.app;

import android.os.Bundle;
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

        // 🛡️ Ghost-Busters: Force Clear WebView Cache & Storage to eliminate old UI traces
        try {
            WebStorage.getInstance().deleteAllData();
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.clearCache(true);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
