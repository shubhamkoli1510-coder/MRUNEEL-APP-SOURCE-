package com.mruneel.assistant;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.speech.SpeechRecognizer;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;

@CapacitorPlugin(
    name = "NativeWakeWord",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class NativeWakeWordPlugin extends Plugin {
    private static final String ACTION_WAKE_WORD = "com.mruneel.assistant.WAKE_WORD_DETECTED";
    private boolean receiverRegistered = false;

    private final android.content.BroadcastReceiver wakeReceiver = new android.content.BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (intent == null || !ACTION_WAKE_WORD.equals(intent.getAction())) return;
            JSObject payload = new JSObject();
            payload.put("transcript", intent.getStringExtra("transcript") == null
                ? "" : intent.getStringExtra("transcript"));
            notifyListeners("wakeWordDetected", payload);
        }
    };

    @Override
    public void load() {
        super.load();
        IntentFilter filter = new IntentFilter(ACTION_WAKE_WORD);
        ContextCompat.registerReceiver(
            getContext(),
            wakeReceiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED
        );
        receiverRegistered = true;
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "startWithMicrophonePermission");
            return;
        }
        startService(call);
    }

    @PermissionCallback
    private void startWithMicrophonePermission(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission is required for wake-word listening.");
            return;
        }
        startService(call);
    }

    private void startService(PluginCall call) {
        try {
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.reject("No Android speech recognition provider is available on this device.");
                return;
            }
            Intent serviceIntent = new Intent(getContext(), com.mruneel.assistant.service.WakeWordForegroundService.class);
            ContextCompat.startForegroundService(getContext(), serviceIntent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to start native wake-word service: " + error.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), com.mruneel.assistant.service.WakeWordForegroundService.class);
            getContext().stopService(serviceIntent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Unable to stop native wake-word service: " + error.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (receiverRegistered) {
            try {
                getContext().unregisterReceiver(wakeReceiver);
            } catch (Exception ignored) { }
            receiverRegistered = false;
        }
        super.handleOnDestroy();
    }
}
