import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Allow the MRUNEEL Android Capacitor app to call this backend.
const allowedOrigins = new Set([
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
  'http://localhost:5173',
  'http://localhost:4173',
]);

app.use((req: Request, res: Response, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({ limit: '25mb' }));

// Initialize Gemini only when its server-side key exists.
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    })
  : null;

// Health check endpoint (never expose API keys).
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    assistant: 'MRUNEEL Core v3.8',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.GEMINI_API_KEY,
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    openaiConfigured: !!process.env.OPENAI_API_KEY,
  });
});

// AI Chat: Gemini primary, OpenAI fallback.
app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const {
      message,
      history = [],
      language = 'mr-IN',
      personalMemories = '',
      telemetry = {},
    } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    let langInstruction =
      'Respond primarily in Marathi (मराठी) with natural conversational Devanagari phrasing, respectful tone (use "सर" or "साहेब"), concise and authoritative.';
    if (language === 'hi-IN') {
      langInstruction =
        'Respond primarily in Hindi (हिंदी) with natural conversational phrasing, respectful tone (use "सर" or "श्रीमान"), concise and authoritative.';
    } else if (language === 'en-US') {
      langInstruction =
        'Respond in crisp, futuristic English inspired by JARVIS, addressing the user as "Sir" or "Boss".';
    }

    const systemInstruction = `
You are MRUNEEL (मृणील), an elite, highly intelligent, loyal personal AI assistant inspired by Tony Stark's JARVIS, engineered for Android devices.

Key Directives:
1. Language & Persona: ${langInstruction}
2. Tone: Calm, sophisticated, hyper-intelligent, technologically advanced, never robotic, always poised and helpful.
3. Capabilities: You handle schedule coordination, alarms, notes, reminders, camera object recognition, Android system telemetry, and general intellect. Never claim an action was completed unless the app confirms it.
4. Telemetry Context: Current device battery is ${telemetry.batteryLevel ? Math.round(telemetry.batteryLevel * 100) + '%' : 'optimal'}, network is ${telemetry.networkType || 'connected'}.
5. User Personal Memory:
${personalMemories || 'User preferences loaded.'}
6. Brevity: Keep conversational voice responses scannable and spoken-friendly (typically 1-3 sentences unless deep reasoning is requested).
`.trim();

    let promptToSend = message;
    if (Array.isArray(history) && history.length > 1) {
      const recent = history
        .slice(-4)
        .map((h: any) => `${h.sender === 'user' ? 'User' : 'MRUNEEL'}: ${h.text}`)
        .join('\n');
      if (recent.trim()) {
        promptToSend = `Recent conversation context:\n${recent}\n\nUser Question:\n${message}`;
      }
    }

    let geminiError = 'Gemini API key not configured';
    if (ai) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini response timed out')), 25000)
        );
        const response = await Promise.race([
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: promptToSend,
            config: { systemInstruction },
          }),
          timeoutPromise,
        ]);
        const replyText = response.text?.trim();
        if (replyText) {
          res.json({
            text: replyText,
            language,
            provider: 'gemini',
            timestamp: Date.now(),
          });
          return;
        }
        geminiError = 'Gemini returned an empty response';
      } catch (error) {
        geminiError = (error as Error).message || 'Gemini request failed';
        console.warn('Gemini failed; trying OpenAI:', geminiError);
      }
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
            instructions: systemInstruction,
            input: promptToSend,
          }),
          signal: AbortSignal.timeout(25000),
        });

        const payload: any = await response.json();
        if (!response.ok) {
          throw new Error(
            payload?.error?.message || `OpenAI API error (${response.status})`
          );
        }

        const extractedText = Array.isArray(payload.output)
          ? payload.output
              .flatMap((item: any) =>
                Array.isArray(item.content) ? item.content : []
              )
              .filter((part: any) => part.type === 'output_text')
              .map((part: any) => part.text || '')
              .join('\n')
              .trim()
          : '';

        const replyText =
          (typeof payload.output_text === 'string'
            ? payload.output_text
            : extractedText).trim();

        if (!replyText) {
          throw new Error('OpenAI returned an empty response');
        }

        res.json({
          text: replyText,
          language,
          provider: 'openai',
          timestamp: Date.now(),
        });
        return;
      } catch (error) {
        const openaiError =
          (error as Error).message || 'OpenAI request failed';
        console.error('OpenAI fallback failed:', openaiError);
        res.status(503).json({
          error: 'All online AI providers are unavailable',
          details: `Gemini: ${geminiError}; OpenAI: ${openaiError}`,
        });
        return;
      }
    }

    res.status(503).json({
      error: 'All online AI providers are unavailable',
      details: `Gemini: ${geminiError}; OpenAI API key is not configured.`,
    });
  } catch (error) {
    console.error('AI chat route error:', error);
    res.status(500).json({
      error: 'Failed to process assistant intelligence request',
      details: (error as Error).message,
    });
  }
});

// Camera Vision & Object Recognition Endpoint (Gemini).
// Never report a successful scan when image analysis has failed.
app.post('/api/gemini/vision', async (req: Request, res: Response) => {
  try {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      prompt,
      language = 'mr-IN',
    } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'imageBase64 image data is required' });
      return;
    }

    if (!ai) {
      res.status(503).json({
        error: 'Camera AI is unavailable',
        details: 'Gemini API key is not configured on the server.',
      });
      return;
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    let visionInstruction =
      'Identify the primary objects, text, documents, scene, or items visible in this Android camera snapshot. State clearly what is seen, key details, and actionable context.';
    if (language === 'mr-IN') {
      visionInstruction +=
        ' Deliver the visual identification report in fluent Marathi (मराठी). Address the user as "सर".';
    } else if (language === 'hi-IN') {
      visionInstruction +=
        ' Deliver the visual identification report in fluent Hindi (हिंदी). Address the user as "सर".';
    } else {
      visionInstruction +=
        ' Deliver the visual identification report in English with high-tech JARVIS clarity.';
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Vision timeout')), 25000)
    );

    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64Data,
              },
            },
            {
              text: prompt || 'Identify objects, text, scene, and details in this camera view.',
            },
          ],
        },
        config: { systemInstruction: visionInstruction },
      }),
      timeoutPromise,
    ]);

    const analysis = response.text?.trim();
    if (!analysis) {
      res.status(503).json({
        error: 'Camera AI returned an empty analysis',
      });
      return;
    }

    res.json({
      analysis,
      provider: 'gemini',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Gemini vision error:', error);
    res.status(503).json({
      error: 'Failed to process vision scan',
      details: (error as Error).message,
    });
  }
});

// Dev mode: Mount Vite middleware, Production: Serve dist
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`MRUNEEL Assistant Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
