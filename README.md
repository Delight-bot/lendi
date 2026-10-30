# Lendi demo site

Working demo of the Banking & Payments quest, with live AI. Runs on Cloudflare Workers.

```
public/index.html   the whole app (screens, logic, styles)
public/config.js    tells the app where to send AI requests (/api/ai)
worker/index.js     serves the app and answers /api/ai by calling Claude with your API key
wrangler.jsonc      Cloudflare settings (name, files, entry point)
```

The API key never goes in these files. It lives in Cloudflare as a secret.

## One-time setup

### 1. Get an Anthropic API key
At console.anthropic.com, add a little credit, set a low monthly spend limit (for example $10), then **API Keys → Create Key**. Keep it private.

### 2. Deploy from GitHub
1. In Cloudflare, go to **Workers & Pages → Create → Import a repository**, then pick `Delight-bot/lendi`.
2. Leave **Build command** empty. Keep **Deploy command** as `npx wrangler deploy`.
3. Leave **Advanced settings → Variables** empty. The key doesn't go there.
4. Click **Deploy**. You get an address like `lendi.<your-name>.workers.dev`.

### 3. Add the API key
1. Go to the `lendi` Worker → **Settings → Variables and Secrets → Add**.
2. **Type: Secret**, **Name:** `ANTHROPIC_API_KEY`, **Value:** your key, then **Deploy**.

### 4. Use your own domain
Go to the `lendi` Worker → **Settings → Domains & Routes → Add → Custom domain**, then enter e.g. `lendi.yourdomain.com`. The domain's DNS needs to be on Cloudflare.

### 5. Test it
Open the site and go to **I'm stuck → Something else**.
- **"Matched by AI"** means the AI works.
- **"Matched by keywords (AI unavailable)"** means it doesn't. Check the secret name, then look at the Worker's **Logs** tab.

## Making changes
Every commit to `main` deploys on its own in about a minute. The bank list and other details are near the top of the script in `public/index.html`. Search for `CONFIG` and `BANKS`.
