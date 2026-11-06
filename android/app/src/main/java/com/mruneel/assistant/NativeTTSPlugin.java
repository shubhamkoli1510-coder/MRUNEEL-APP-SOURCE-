package com.mruneel.assistant;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(name = "NativeTTS")
public class NativeTTSPlugin extends Plugin {

    private TextToSpeech tts;
    private volatile boolean ready = false;

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), status -> {
            ready = (status == TextToSpeech.SUCCESS);
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        String lang = call.getString("lang", "mr-IN");
        Double rateValue = call.getDouble("rate");
        Double pitchValue = call.getDouble("pitch");

        if (text == null || text.trim().isEmpty()) {
            call.resolve();
            return;
        }

        if (!ready || tts == null) {
            call.reject("Android TTS engine is not ready");
            return;
        }

        int result = tts.setLanguage(Locale.forLanguageTag(lang));

        if (result == TextToSpeech.LANG_MISSING_DATA ||
                result == TextToSpeech.LANG_NOT_SUPPORTED) {
            result = tts.setLanguage(Locale.forLanguageTag("hi-IN"));
        }

        if (result == TextToSpeech.LANG_MISSING_DATA ||
                result == TextToSpeech.LANG_NOT_SUPPORTED) {
            result = tts.setLanguage(Locale.forLanguageTag("en-IN"));
        }

        if (result == TextToSpeech.LANG_MISSING_DATA ||
                result == TextToSpeech.LANG_NOT_SUPPORTED) {
            call.reject("No supported TTS voice installed");
            return;
        }

        float rate = rateValue == null ? 1.0f : rateValue.floatValue();
        float pitch = pitchValue == null ? 1.0f : pitchValue.floatValue();

        tts.setSpeechRate(Math.max(0.5f, Math.min(2.0f, rate)));
        tts.setPitch(Math.max(0.5f, Math.min(2.0f, pitch)));

        String id = UUID.randomUUID().toString();

        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override
            public void onStart(String utteranceId) {
            }

            @Override
            public void onDone(String utteranceId) {
                if (id.equals(utteranceId) && getActivity() != null) {
                    getActivity().runOnUiThread(call::resolve);
                }
            }

            @Override
            public void onError(String utteranceId) {
                if (id.equals(utteranceId) && getActivity() != null) {
                    getActivity().runOnUiThread(
                            () -> call.reject("Android TTS playback failed"));
                }
            }
        });

        int speakResult = tts.speak(
                text,
                TextToSpeech.QUEUE_FLUSH,
                null,
                id
        );

        if (speakResult == TextToSpeech.ERROR) {
            call.reject("Android TTS could not start");
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (tts != null) {
            tts.stop();
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }

        ready = false;
        super.handleOnDestroy();
    }
}
