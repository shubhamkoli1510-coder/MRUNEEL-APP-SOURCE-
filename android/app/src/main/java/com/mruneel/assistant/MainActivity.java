package com.mruneel.assistant;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;
import com.mruneel.assistant.service.WakeWordForegroundService;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeTTSPlugin.class);
        super.onCreate(savedInstanceState);

        // Keep screen on while assistant active
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Start Background Wake Word Foreground Service
        Intent serviceIntent = new Intent(this, WakeWordForegroundService.class);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }
}
