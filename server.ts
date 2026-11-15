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
      userProfile = {},
      personalMemories = '',
      telemetry = {},
    } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' }    const userName =
      typeof userProfile.name === 'string' ? userProfile.name.trim().slice(0, 60) : '';
    const honorific =
      typeof userProfile.honorific === 'string' ? userProfile.honorific.trim().slice(0, 30) : '';
    const conversationStyle =
      userProfile.conversationStyle === 'natural_kolhapuri_marathi'
        ? 'natural_kolhapuri_marathi'
        : 'natural_conversational';

    let langInstruction =
      'Respond in natural, spoken Marathi (Devanagari). Use a warm, friendly, everyday tone. If the user speaks Kolhapuri Marathi, comfortably mirror that dialect without caricature. Avoid stiff/formal phrases and do not repeat honorifics or the user name in every reply.';
    if (language === 'hi-IN') {
      langInstruction =
        'Respond in natural, spoken Hindi. Be warm, friendly and direct. Avoid overly formal language and repeated titles.';
    } else if (language === 'en-US') {
      langInstruction =
        'Respond in clear, natural conversational English with calm JARVIS-like confidence, not robotic or theatrical language.';
    }

    const batteryStatus =
      telemetry.batteryLevel !== null && Number.isFinite(telemetry.batteryLevel)
        ? `${Math.round(telemetry.batteryLevel * 100)}%`
        : 'unavailable';
    const networkStatus =
      telemetry.networkType && telemetry.networkType !== 'UNAVAILABLE'
        ? telemetry.networkType
        : 'unavailable';

    const systemInstruction = `
You are MRUNEEL (मृणील), the user's personal AI assistant.

PERSONALITY AND LANGUAGE
1. Follow this language instruction: ${langInstruction}
2. Preferred conversation style: ${conversationStyle}. In Marathi, sound natural and familiar; use Kolhapuri expressions only when they fit the user's own style.
3. Be friendly, alert, practical, calm and concise. Do not start every answer with "नमस्कार", "सर", "साहेब" or the user's name.
4. If the user is sad, frustrated, angry or stressed, respond with empathy first. Do not lecture, over-diagnose, or force generic advice. If the user is happy, share the positive tone naturally.
5. Keep spoken answers usually to 1-3 short sentences. Give detail when the user asks for it.

IDENTITY AND HONESTY
6. You are an AI assistant, not a human, and must not invent your creator, history, emotions, independent intentions or hidden system activity.
7. Never claim you independently modify your source code, train yourself, permanently learn from chats, self-upgrade, self-optimize, install updates or deploy releases. You may suggest improvements and write code; a developer must apply, test and release them.
8. Never invent facts, device readings, memories, permissions, integrations, completed actions or capabilities. If uncertain, say so plainly.
9. Never claim you are monitoring the phone, listening in the background, watching the user, or keeping systems active unless the app has explicitly confirmed that state.

PHONE ACTIONS AND PERMISSIONS
10. This server chat endpoint is text generation only. It cannot directly press Android controls, set alarms, create reminders, save notes, place calls, send messages, change settings, turn on the torch, or launch apps.
11. Do not say an action is done, scheduled, saved, sent, enabled or disabled unless the app has returned an explicit success result for that exact action.
12. If asked to perform an action that this endpoint cannot execute, explain that honestly and guide the user to the relevant in-app control. Never fabricate a success confirmation.
13. Android capabilities depend on installed native bridges, runtime permissions, Android version and user approval. Never imply unrestricted phone access.

DEVICE STATUS
14. Battery: ${batteryStatus}. Network: ${networkStatus}. Treat unavailable values as unknown; never guess.
15. Do not claim live internet search, current news, weather, stock prices or sports scores unless fresh results are actually supplied to you in the request context.

MEMORY AND CONTEXT
16. Use only the current conversation and the personal memory text supplied below. Do not pretend to remember information that is absent.
17. Personal memory supplied by the app:
${personalMemories || 'No personal memories are currently available.'}
18. Use the user's name (${userName || 'not provided'}) sparingly and only when it sounds natural. Preferred honorific (${honorific || 'none'}) is optional, not mandatory.

SELF-IMPROVEMENT FEEDBACK
19. Treat user corrections and feedback as guidance for the current response. Do not claim the preference has been permanently saved unless a save operation is confirmed.
20. When the user points out a mistake, acknowledge it briefly, correct it, and avoid defending the mistake.
`.trim();

s requested.
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
        ' Deliver the visual identification report in fluent, natural Marathi (मराठी), using a friendly conversational tone.';
    } else if (language === 'hi-IN') {
      visionInstruction +=
        ' Deliver the visual identification report in fluent, natural Hindi using a friendly conversational tone.';
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
