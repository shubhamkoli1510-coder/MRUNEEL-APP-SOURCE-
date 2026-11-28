package com.mruneel.assistant;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AndroidSettings")
public class AndroidSettingsPlugin extends Plugin {
    private void openIntent(PluginCall call, Intent intent) {
        try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (intent.resolveActivity(getContext().getPackageManager()) == null) {
                call.reject("Android Settings screen is unavailable on this device");
                return;
            }
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open Android Settings", e);
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        openIntent(call, new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.parse("package:" + getContext().getPackageName())));
    }

    @PluginMethod
    public void openDeveloperOptions(PluginCall call) {
        openIntent(call, new Intent(Settings.ACTION_APPLICATION_DEVELOPMENT_SETTINGS));
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        openIntent(call, new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        openIntent(call, intent);
    }

    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        openIntent(call, new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
    }

    @PluginMethod
    public void openAssistantSettings(PluginCall call) {
        openIntent(call, new Intent("android.settings.VOICE_INPUT_SETTINGS"));
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        if (android.os.Build.VERSION.SDK_INT >= 31) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                Uri.parse("package:" + getContext().getPackageName()));
            openIntent(call, intent);
        } else {
            call.reject("Exact alarm access settings are not needed on this Android version");
        }
    }
}
