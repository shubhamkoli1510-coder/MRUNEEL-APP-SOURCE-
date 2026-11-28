package com.mruneel.assistant;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.os.VibratorManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "AndroidDeviceActions", permissions = {
    @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
})
public class AndroidDeviceActionsPlugin extends Plugin {
    private String flashCameraId = null;
    private boolean torchEnabled = false;

    @PluginMethod
    public void setTorch(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) { call.reject("enabled must be true or false"); return; }
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "torchPermissionCallback");
            return;
        }
        applyTorch(call, enabled);
    }

    @PermissionCallback
    private void torchPermissionCallback(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            call.reject("Camera permission not granted; torch was not changed");
            return;
        }
        if (enabled == null) { call.reject("Missing torch state"); return; }
        applyTorch(call, enabled);
    }

    private void applyTorch(PluginCall call, boolean enabled) {
        try {
            CameraManager manager = (CameraManager) getContext().getSystemService(Context.CAMERA_SERVICE);
            if (manager == null) { call.reject("Camera service unavailable"); return; }
            if (flashCameraId == null) {
                for (String id : manager.getCameraIdList()) {
                    if (manager.getCameraCharacteristics(id).get(android.hardware.camera2.CameraCharacteristics.FLASH_INFO_AVAILABLE) == Boolean.TRUE) {
                        flashCameraId = id; break;
                    }
                }
            }
            if (flashCameraId == null) { call.reject("This device has no torch hardware"); return; }
            manager.setTorchMode(flashCameraId, enabled);
            torchEnabled = enabled;
            call.resolve(new com.getcapacitor.JSObject().put("enabled", torchEnabled));
        } catch (Exception e) { call.reject("Torch action failed", e); }
    }

    @PluginMethod
    public void adjustVolume(PluginCall call) {
        Integer direction = call.getInt("direction");
        if (direction == null || (direction != -1 && direction != 1)) {
            call.reject("Direction must be -1 or 1"); return;
        }
        AudioManager audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        if (audio == null) { call.reject("Audio service unavailable"); return; }
        int stream = AudioManager.STREAM_MUSIC;
        int current = audio.getStreamVolume(stream);
        int max = audio.getStreamMaxVolume(stream);
        int next = Math.max(0, Math.min(max, current + direction));
        audio.setStreamVolume(stream, next, AudioManager.FLAG_SHOW_UI);
        call.resolve(new com.getcapacitor.JSObject().put("volume", next).put("max", max));
    }

    @PluginMethod
    public void vibrate(PluginCall call) {
        Integer duration = call.getInt("durationMs", 100);
        if (duration == null) duration = 100;
        duration = Math.max(1, Math.min(500, duration));
        try {
            Vibrator vibrator;
            if (Build.VERSION.SDK_INT >= 31) {
                VibratorManager manager = (VibratorManager) getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                vibrator = manager != null ? manager.getDefaultVibrator() : null;
            } else {
                vibrator = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
            }
            if (vibrator == null || !vibrator.hasVibrator()) { call.reject("Vibration hardware unavailable"); return; }
            if (Build.VERSION.SDK_INT >= 26) vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
            else vibrator.vibrate(duration);
            call.resolve();
        } catch (Exception e) { call.reject("Vibration action failed", e); }
    }

    @PluginMethod
    public void openScreen(PluginCall call) {
        String target = call.getString("target");
        Intent intent;
        if ("wifi".equals(target)) {
            intent = new Intent(Settings.ACTION_WIFI_SETTINGS);
        } else if ("bluetooth".equals(target)) {
            intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
        } else if ("settings".equals(target)) {
            intent = new Intent(Settings.ACTION_SETTINGS);
        } else if ("camera".equals(target)) {
            intent = new Intent("android.media.action.IMAGE_CAPTURE");
        } else if ("dialer".equals(target)) {
            intent = new Intent(Intent.ACTION_DIAL);
        } else {
            call.reject("Unsupported screen target");
            return;
        }
        try {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (intent.resolveActivity(getContext().getPackageManager()) == null) {
                call.reject("No compatible activity available");
                return;
            }
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open requested screen", e);
        }
    }

    @PluginMethod
    public void launchApp(PluginCall call) {
        String appId = call.getString("appId");
        String packageName = null;
        if ("whatsapp".equals(appId)) packageName = "com.whatsapp";
        else if ("youtube".equals(appId)) packageName = "com.google.android.youtube";
        else if ("chrome".equals(appId)) packageName = "com.android.chrome";
        else if ("maps".equals(appId)) packageName = "com.google.android.apps.maps";
        else if ("phone".equals(appId)) packageName = "com.samsung.android.dialer";
        else if ("camera".equals(appId)) packageName = "com.sec.android.app.camera";
        else if ("calculator".equals(appId)) packageName = "com.sec.android.app.popupcalculator";
        else if ("settings".equals(appId)) packageName = "com.android.settings";
        else { call.reject("App target is not allowlisted"); return; }
        try {
            Intent launch = getContext().getPackageManager().getLaunchIntentForPackage(packageName);
            if (launch == null) { call.reject("Allowlisted app is not installed or has no launcher activity"); return; }
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(launch);
            call.resolve(new com.getcapacitor.JSObject().put("appId", appId).put("packageName", packageName));
        } catch (Exception e) { call.reject("Could not launch allowlisted app", e); }
    }

    @PluginMethod
    public void getDeviceStatus(PluginCall call) {
        try {
            BatteryManager battery = (BatteryManager) getContext().getSystemService(Context.BATTERY_SERVICE);
            int level = battery != null ? battery.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) : -1;
            boolean charging = battery != null && battery.isCharging();
            ConnectivityManager cm = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
            Network active = cm != null ? cm.getActiveNetwork() : null;
            NetworkCapabilities caps = active != null && cm != null ? cm.getNetworkCapabilities(active) : null;
            boolean online = caps != null && (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
            String kind = "OFFLINE";
            if (caps != null) {
                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) kind = "WIFI";
                else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) kind = "CELLULAR";
                else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) kind = "ETHERNET";
                else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH)) kind = "BLUETOOTH";
            }
            AudioManager audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            int volume = audio != null ? audio.getStreamVolume(AudioManager.STREAM_MUSIC) : -1;
            int maxVolume = audio != null ? audio.getStreamMaxVolume(AudioManager.STREAM_MUSIC) : -1;
            call.resolve(new com.getcapacitor.JSObject().put("batteryLevel", level >= 0 ? level : null)
                .put("isCharging", charging).put("isOnline", online).put("networkType", kind)
                .put("musicVolume", volume).put("musicVolumeMax", maxVolume).put("torchEnabled", torchEnabled));
        } catch (Exception e) { call.reject("Could not read device status", e); }
    }
}
