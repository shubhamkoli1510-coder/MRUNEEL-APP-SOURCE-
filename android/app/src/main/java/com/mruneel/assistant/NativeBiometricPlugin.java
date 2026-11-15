package com.mruneel.assistant;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

/**
 * Native Android biometric authentication.
 * A successful result is returned only from Android's authenticated callback.
 */
@CapacitorPlugin(name = "NativeBiometric")
public class NativeBiometricPlugin extends Plugin {

    @PluginMethod
    public void authenticate(PluginCall call) {
        if (!(getActivity() instanceof FragmentActivity)) {
            resolveResult(call, false, "Android biometric prompt is unavailable.");
            return;
        }

        BiometricManager manager = BiometricManager.from(getContext());
        int availability = manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
        if (availability != BiometricManager.BIOMETRIC_SUCCESS) {
            resolveResult(call, false, "या फोनवर वापरण्यायोग्य बायोमेट्रिक उपलब्ध नाही किंवा नोंदवलेले नाही.");
            return;
        }

        FragmentActivity activity = (FragmentActivity) getActivity();
        Executor executor = ContextCompat.getMainExecutor(getContext());

        BiometricPrompt prompt = new BiometricPrompt(
            activity,
            executor,
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                    resolveResult(call, true, "बायोमेट्रिक प्रमाणीकरण यशस्वी.");
                }

                @Override
                public void onAuthenticationError(int errorCode, CharSequence errString) {
                    resolveResult(call, false, errString == null
                        ? "बायोमेट्रिक प्रमाणीकरण रद्द झाले."
                        : errString.toString());
                }

                @Override
                public void onAuthenticationFailed() {
                    // Keep the prompt open; Android may allow another biometric attempt.
                }
            }
        );

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
            .setTitle("Unlock MRUNEEL")
            .setSubtitle("Confirm your identity to continue")
            .setNegativeButtonText("Cancel")
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK)
            .build();

        prompt.authenticate(promptInfo);
    }

    private void resolveResult(PluginCall call, boolean success, String message) {
        JSObject result = new JSObject();
        result.put("success", success);
        result.put("message", message);
        call.resolve(result);
    }
}
