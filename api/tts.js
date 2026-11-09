const MAX_TEXT_LENGTH = 5000;
const MAX_REQUESTS_PER_MINUTE = 10;
const MAX_CHARS_PER_IP_PER_DAY = 20000;
const DEFAULT_GLOBAL_DAILY_CHAR_LIMIT = 50000;

function sendJson(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: message }));
}

function allowedOrigin(req) {
  const origin = req.headers.origin || '';
  const configuredOrigin = process.env.APP_ORIGIN || '';
  if (configuredOrigin && origin === configuredOrigin) return origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return '';
}

async function checkAndCountUsage(ip, textLength) {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken) throw new Error('Rate limiting is not configured. Set up Upstash Redis first.');

  const safeIp = ip.replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 80);
  const day = new Date().toISOString().slice(0, 10);
  const globalLimit = Number(process.env.TTS_DAILY_CHAR_LIMIT) || DEFAULT_GLOBAL_DAILY_CHAR_LIMIT;
  const script = `
    local requests = redis.call('INCR', KEYS[1])
    if requests == 1 then redis.call('EXPIRE', KEYS[1], 60) end
    if requests > tonumber(ARGV[1]) then return 1 end
    local ipChars = redis.call('INCRBY', KEYS[2], tonumber(ARGV[2]))
    if ipChars == tonumber(ARGV[2]) then redis.call('EXPIRE', KEYS[2], 86400) end
    if ipChars > tonumber(ARGV[3]) then
      redis.call('DECRBY', KEYS[2], tonumber(ARGV[2]))
      return 2
    end
    local totalChars = redis.call('INCRBY', KEYS[3], tonumber(ARGV[2]))
    if totalChars == tonumber(ARGV[2]) then redis.call('EXPIRE', KEYS[3], 86400) end
    if totalChars > tonumber(ARGV[4]) then
      redis.call('DECRBY', KEYS[2], tonumber(ARGV[2]))
      redis.call('DECRBY', KEYS[3], tonumber(ARGV[2]))
      return 3
    end
    return 0
  `;

  const response = await fetch(`${redisUrl}/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      'EVAL', script, '3',
      `tts:minute:${safeIp}`,
      `tts:ipday:${day}:${safeIp}`,
      `tts:globalday:${day}`,
      String(MAX_REQUESTS_PER_MINUTE),
      String(textLength),
      String(MAX_CHARS_PER_IP_PER_DAY),
      String(globalLimit),
    ]),
  });
  if (!response.ok) throw new Error('Could not verify voice usage limits.');
  const result = await response.json();
  if (result.result === 1) return 'Too many requests. Please wait a minute and try again.';
  if (result.result === 2) return 'Daily narration limit reached for this connection.';
  if (result.result === 3) return 'The app has reached its daily narration allowance. Try again tomorrow.';
  if (result.result !== 0) throw new Error('Could not verify voice usage limits.');
  return '';
}

export default async function handler(req, res) {
  const origin = allowedOrigin(req);
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') return sendJson(res, 405, 'Method not allowed.');
  if (!origin) return sendJson(res, 403, 'This website is not allowed to use the voice service.');
  if (!process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_VOICE_ID) {
    return sendJson(res, 503, 'Voice service setup is incomplete. Configure the server environment variables.');
  }

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) return sendJson(res, 400, 'Narration text is required.');
  if (text.length > MAX_TEXT_LENGTH) {
    return sendJson(res, 413, `Narration must be ${MAX_TEXT_LENGTH} characters or fewer.`);
  }

  try {
    const ip = req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
    const usageError = await checkAndCountUsage(String(ip).split(',')[0].trim(), text.length);
    if (usageError) return sendJson(res, 429, usageError);

    const voiceUrl = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(process.env.ELEVENLABS_VOICE_ID)}?output_format=mp3_44100_128`;
    const voiceResponse = await fetch(voiceUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
      }),
    });
    if (!voiceResponse.ok) {
      if (voiceResponse.status === 401 || voiceResponse.status === 403) {
        return sendJson(res, 502, 'The voice provider rejected its server key. Check your ElevenLabs setup.');
      }
      if (voiceResponse.status === 429) return sendJson(res, 429, 'The voice provider is busy or its plan limit was reached. Try later.');
      return sendJson(res, 502, 'The voice provider could not generate audio. Check the voice ID and account.');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.end(Buffer.from(await voiceResponse.arrayBuffer()));
  } catch (error) {
    return sendJson(res, 503, error.message || 'Voice service is temporarily unavailable.');
  }
}
