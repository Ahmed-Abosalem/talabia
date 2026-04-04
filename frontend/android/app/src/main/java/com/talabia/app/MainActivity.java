package com.talabia.app;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Handle the splash screen transition correctly for API 31+
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
    }
}
