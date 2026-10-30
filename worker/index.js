// Lendi Worker: serves the app from /public and answers AI requests at /api/ai.
// Only answers the app's three AI requests. Your API key stays on Cloudflare as a secret.
// Cloudflare > Workers & Pages > lendi > Settings > Variables and Secrets:
//   ANTHROPIC_API_KEY  (Secret)          your key from console.anthropic.com
//   MODEL              (Text, optional)  defaults to claude-haiku-5-5

const BANKS = [
  'Chase (Ruston branch): publishes these requirements for international students: Passport + I-20, Student ID, Proof of US address',
  'Origin Bank (University Banking Center): does not publish requirements we could check',
  'Regions (Trenton Street branch): does not publish requirements we could check'
];

function prompts(body) {
  const clip = (s, n) => String(s || '').slice(0, n);
  if (body.task === 'match' && body.quest === 'transport') {
    return {
      json: true,
      prompt:
        'You help international students at Grambling State University who get stuck getting around without a car. ' +
        'Classify the student\'s message into exactly one known problem, or "none" if it fits none of them:\n' +
        '- missed: they missed the campus shuttle or it left without them\n' +
        '- noid: they do not have their GSU student ID yet, or it was not accepted\n' +
        '- notrunning: the shuttle is not running on the day they need it\n' +
        '- card: Uber, Lyft or another ride app will not accept their card or payment\n' +
        '- airport: they need a ride to or from an airport, arriving or leaving\n' +
        'Reply with only JSON like {"match":"missed","summary":"You missed the campus shuttle"}. ' +
        'summary restates their problem in under 12 words, addressed to them. Give no advice.\n\n' +
        'Student\'s message: """' + clip(body.text, 600) + '"""'
    };
  }
  if (body.task === 'match') {
    return {
      json: true,
      prompt:
        'You help international students who get stuck while opening a US bank account. ' +
        'Classify the student\'s message into exactly one known problem, or "none" if it fits none of them:\n' +
        '- ssn: the bank asked for a Social Security Number (SSN) or ITIN\n' +
        '- id: their passport, visa, I-20 or other ID was not accepted\n' +
        '- address: they lack proof of a US address (lease, utility bill, housing letter)\n' +
        '- number: the bank needs a US phone number\n' +
        '- fees: they do not understand fees, minimum balances or charges\n' +
        'Reply with only JSON like {"match":"address","summary":"You need proof of a US address"}. ' +
        'summary restates their problem in under 12 words, addressed to them. Give no advice.\n\n' +
        'Student\'s message: """' + clip(body.text, 600) + '"""'
    };
  }
  if (body.task === 'tip') {
    return {
      json: true,
      prompt:
        'You review tips that international students post for other students about ' + (body.quest === 'transport' ? 'getting around a US college town without a car' : 'opening a US bank account') + '. ' +
        'Decide whether this tip is safe to publish. Block it if it contains personal identifiers or financial details ' +
        '(card, account, routing, SSN, passport or visa numbers, PINs, passwords, a home address, a personal phone number or email), ' +
        'a scam or something that looks like one (asking people to send money, buy gift cards, or share codes), advertising or referral links, or harassment. ' +
        'Informal advice is fine; do not judge whether it is correct.\n' +
        'Reply with only JSON like {"allow":true,"reason":""}. If blocked, reason says what to remove in under 15 words.\n\n' +
        'Tip: """' + clip(body.text, 800) + '"""'
    };
  }
  if (body.task === 'kit') {
    const kit = Array.isArray(body.kit) ? body.kit.slice(0, 12).map((k) => clip(k, 40)) : [];
    return {
      json: false,
      prompt:
        'You help an international student compare banks near campus. Using ONLY the facts below, write 2 short sentences, addressed to the student: ' +
        'say which published requirements they already meet and what they still need, and that banks without a published list should be asked directly. ' +
        'Do not recommend a bank, do not add requirements that are not listed, no lists or markdown.\n\n' +
        'Student has: ' + (kit.join(', ') || 'nothing ticked yet') + '\n\nBanks:\n- ' + BANKS.join('\n- ')
    };
  }
  return null;
}

function parseJSON(text) {
  try { return JSON.parse(text); } catch (e) {}
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch (e) {} }
  return null;
}

// light per-instance limit: 20 requests per minute per visitor
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 60000, max = 20;
  const list = (hits.get(ip) || []).filter((t) => now - t < win);
  list.push(now); hits.set(ip, list);
  return list.length > max;
}

async function handleAI(request, env) {
  const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
  if (request.method !== 'POST') return reply({ error: 'POST only' }, 405);
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ error: 'origin not allowed' }, 403);
  if (!env.ANTHROPIC_API_KEY) return reply({ error: 'missing ANTHROPIC_API_KEY' }, 500);
  if (limited(request.headers.get('CF-Connecting-IP') || 'x')) return reply({ error: 'slow down' }, 429);

  let body;
  try { body = await request.json(); } catch (e) { return reply({ error: 'bad json' }, 400); }
  const p = prompts(body || {});
  if (!p) return reply({ error: 'unknown task' }, 400);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.MODEL || 'claude-haiku-5-5', max_tokens: 300, messages: [{ role: 'user', content: p.prompt }] })
  });
  if (!res.ok) return reply({ error: 'ai unavailable', status: res.status }, 502);
  const data = await res.json();
  const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
  if (!p.json) return reply({ result: { text } });
  const parsed = parseJSON(text);
  return parsed ? reply({ result: parsed }) : reply({ error: 'bad ai reply' }, 502);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ai') return handleAI(request, env);
    return env.ASSETS.fetch(request);
  }
};
