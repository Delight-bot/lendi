# Lendi demo site

Working demo of the Banking & Payments quest, with live AI.

```
index.html            the whole app (screens, logic, styles)
config.js             tells the app where to send AI requests (/api/ai)
functions/api/ai.js   the AI endpoint; calls Claude with your API key
```

The API key never goes in these files. It lives in Cloudflare as a secret.

## One-time setup (about 30 minutes)

### 1. Get an Anthropic API key
1. Go to console.anthropic.com and sign in.
2. **Billing**: add a small amount of credit. A demo uses very little.
3. **Limits**: set a low monthly spend limit, for example $10.
4. **API Keys → Create Key**. Copy it and keep it private. Don't paste it into chats, docs or these files.

### 2. Put this folder on GitHub
1. Go to github.com/new, name the repo `lendi-demo`, and click **Create repository**. Private is fine.
2. Click **uploading an existing file**.
3. Drag in **everything inside this folder**: `index.html`, `config.js`, `README.md` and the `functions` folder.
4. Check that `functions/api/ai.js` appears in the list, then click **Commit changes**.

### 3. Connect it to Cloudflare Pages
1. Go to dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages** → **Import an existing Git repository**.
2. Allow Cloudflare to see your GitHub, then pick `lendi-demo`.
3. Build settings: **Framework preset: None**. Leave **Build command** empty. Set **Build output directory** to `/`.
4. Click **Save and Deploy**. You get an address like `lendi-demo.pages.dev`.

### 4. Add the API key
1. In the Pages project: **Settings → Variables and Secrets → Add**.
2. **Type: Secret**, **Name:** `ANTHROPIC_API_KEY`, **Value:** your key. Save it for **Production**.
3. Go to **Deployments**, then on the latest one choose **Retry deployment** so it picks up the key.

### 5. Use your own domain
1. In the Pages project: **Custom domains → Set up a custom domain**, then enter e.g. `lendi.yourdomain.com`.
2. If your domain's DNS is on Cloudflare, it's set up for you. If not, add the CNAME record it shows (`lendi` → `lendi-demo.pages.dev`) at your domain registrar.
3. The domain can take a few minutes to start working.

### 6. Test it
Open the site, go to **I'm stuck → Something else**, and type a problem.
- **"Matched by AI"** means the AI works.
- **"Matched by keywords (AI unavailable)"** means it doesn't. Check the secret name is exactly `ANTHROPIC_API_KEY`, redeploy, and look at the project's **Functions → Logs**.

## Making changes

Every change you commit to GitHub goes live on its own in about a minute.
- **Small edits**: open the file on GitHub, click the pencil, edit, then click **Commit changes**.
- **Bigger changes** (screens, wording, new features): ask for updated files, then upload them over the old ones on GitHub (**Add file → Upload files**).

The bank list and other details are near the top of the script in `index.html`. Search for `CONFIG` and `BANKS`.
