package com.mruneel.assistant.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.app.NotificationCompat
import java.util.Locale

/**
 * Microphone service started explicitly by NativeWakeWordPlugin while the app is visible
 * and RECORD_AUDIO permission has been granted. It stops itself after one wake event.
 */
class WakeWordForegroundService : Service() {
    companion object {
        const val ACTION_WAKE_WORD = "com.mruneel.assistant.WAKE_WORD_DETECTED"
        private const val CHANNEL_ID = "mruneel_service_channel"
        private const val NOTIFICATION_ID = 1001
    }

    private var speechRecognizer: SpeechRecognizer? = null
    private var recognizerIntent: Intent? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var isListening = false
    private var wakeWordTriggered = false
    private var serviceStarted = false

    private val wakePatterns = listOf(
        "mruneel", "mrunil", "mrunal", "runeel",
        "मृणील", "मृणाल", "म्रुनील", "मरुनिल", "मृणिल", "हे मृणील"
    )

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (serviceStarted) return START_NOT_STICKY
        serviceStarted = true

        // Plugin starts this service from a visible Activity after runtime permission approval.
        startForeground(NOTIFICATION_ID, createNotification())
        mainHandler.post {
            if (!wakeWordTriggered) {
                initSpeechRecognizer()
                startListening()
            }
        }
        return START_NOT_STICKY
    }

    private fun initSpeechRecognizer() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            stopSelf()
            return
        }

        speechRecognizer?.destroy()
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        recognizerIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "mr-IN")
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "mr-IN")
            putExtra("android.speech.extra.EXTRA_ADDITIONAL_LANGUAGES", arrayOf("en-US", "hi-IN"))
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
        }

        speechRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) { isListening = true }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() { isListening = false }

            override fun onError(error: Int) {
                isListening = false
                scheduleRestart(1200)
            }

            override fun onResults(results: Bundle?) {
                isListening = false
                checkMatches(results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION))
                if (!wakeWordTriggered) scheduleRestart(500)
            }

            override fun onPartialResults(partialResults: Bundle?) {
                checkMatches(partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION))
            }

            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
    }

    private fun scheduleRestart(delayMs: Long) {
        if (!wakeWordTriggered) {
            mainHandler.postDelayed({ startListening() }, delayMs)
        }
    }

    private fun startListening() {
        if (wakeWordTriggered || isListening || speechRecognizer == null || recognizerIntent == null) return
        try {
            speechRecognizer?.startListening(recognizerIntent)
        } catch (error: Exception) {
            isListening = false
            scheduleRestart(1500)
        }
    }

    private fun checkMatches(matches: ArrayList<String>?) {
        if (wakeWordTriggered || matches == null) return
        for (spokenText in matches) {
            val lower = spokenText.lowercase(Locale.ROOT)
            if (wakePatterns.any { pattern -> lower.contains(pattern) }) {
                onWakeWordDetected(spokenText)
                return
            }
        }
    }

    private fun onWakeWordDetected(spokenText: String) {
        if (wakeWordTriggered) return
        wakeWordTriggered = true
        isListening = false
        mainHandler.removeCallbacksAndMessages(null)

        try {
            speechRecognizer?.stopListening()
            speechRecognizer?.cancel()
        } catch (ignored: Exception) { }
        triggerHapticFeedback()

        // Package-scoped, non-exported receiver bridge; do not launch an Activity from background.
        sendBroadcast(
            Intent(ACTION_WAKE_WORD)
                .setPackage(packageName)
                .putExtra("transcript", spokenText)
        )
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun triggerHapticFeedback() {
        try {
            val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 80, 50, 100), -1))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(120)
            }
        } catch (ignored: Exception) { }
    }

    private fun createNotification(): Notification {
        val notificationIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = notificationIntent?.let {
            PendingIntent.getActivity(
                this, 0, it,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
            )
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MRUNEEL AI Active")
            .setContentText("मृणील व्हॉइस कोर सक्रिय आहे • Say 'Mruneel'")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "MRUNEEL Background Assistant Service",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        wakeWordTriggered = true
        isListening = false
        mainHandler.removeCallbacksAndMessages(null)
        try {
            speechRecognizer?.cancel()
            speechRecognizer?.destroy()
        } catch (ignored: Exception) { }
        speechRecognizer = null
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
