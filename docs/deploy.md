# Deploy online for free (Neon + Render + Vercel)

The project goes online in 3 parts, each on a free service:

| Part | Where | What it is |
|---|---|---|
| Database | **Neon** (neon.com) | PostgreSQL, free and permanent |
| API + face recognition | **Render** (render.com) | One free web service built from the `Dockerfile` |
| Website | **Vercel** (vercel.com) | The React frontend |

Sign up to all three **with your GitHub account** (button "Continue with GitHub"): it's faster and lets them read the repository. No credit card is needed.

Total time: about 20 minutes, mostly waiting for builds.

---

## Step 1 — Database on Neon

1. Go to **https://neon.com** → **Sign up** → **Continue with GitHub**.
2. Create a project:
   - Project name: `bouebdelli-smart-uni`
   - Region: **Europe (Frankfurt)** (closest to Tunisia)
   - Click **Create project**.
3. On the project page, click **Connect** (or "Connection string").
4. Copy the connection string. It looks like:
   ```
   postgresql://neondb_owner:AbC123...@ep-something.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
   Keep it for step 2. ⚠️ It contains the database password: don't post it anywhere public.

---

## Step 2 — API on Render

1. Go to **https://render.com** → **Get Started** → **GitHub**.
2. In the dashboard, click **New +** → **Blueprint**.
3. Connect your GitHub account if asked, then choose the repository **bouebdelli-smart-uni** → **Connect**.
4. Render reads the `render.yaml` file and shows the service **bouebdelli-smart-uni-api**. It asks for one value:
   - **DATABASE_URL** → paste the Neon connection string from step 1.
5. Click **Apply** (or **Deploy Blueprint**).
6. Wait for the build (5 to 10 minutes the first time). Open the service: the logs must end with:
   ```
   Empty database: creating demo data...
   Demo data created.
   Server running on port ...
   ```
7. At the top of the service page, copy its address, e.g.
   `https://bouebdelli-smart-uni-api.onrender.com`
8. Check it: open that address followed by `/api/health` in your browser. You should see
   `{"status":"OK", ...}`.

---

## Step 3 — Website on Vercel

1. Go to **https://vercel.com** → **Sign Up** → **Continue with GitHub**.
2. Click **Add New…** → **Project** → find **bouebdelli-smart-uni** → **Import**.
3. On the configuration screen:
   - **Root Directory**: click **Edit** → choose **`frontend`** → **Continue**.
   - Framework Preset: **Vite** (detected automatically).
   - Open **Environment Variables** and add:
     | Name | Value |
     |---|---|
     | `VITE_API_URL` | your Render address from step 2 **followed by `/api`**, e.g. `https://bouebdelli-smart-uni-api.onrender.com/api` |
4. Click **Deploy**. After about a minute you get your site address, e.g.
   `https://bouebdelli-smart-uni.vercel.app`

Open it and log in with `admin@smartuni.com` / `password123`. 🎉

---

## Step 4 — Secure the demo (important)

The site is now public: anyone who finds it can try the demo passwords, which are written in this repository.

1. Log in as **admin** → click your name (bottom left) → **Changer le mot de passe**.
2. **Boîtiers caméra** → on each box → **Nouvelle clé** (the demo keys are public in the code).
3. Do the same for any account you will use in front of others (or delete the demo accounts you don't need in **Utilisateurs**).

---

## Good to know

- **First visit after a pause is slow (~1 minute).** Render's free service goes to sleep after 15 minutes without visits and wakes up on the next request. Before a demo, open the site 2 minutes early.
- **Absences** are recorded when someone opens the dashboard or an attendance sheet after a class has ended (the server may be asleep at the end of the class).
- **The camera works online** (Vercel and Render use HTTPS, which browsers require for the webcam): admin → **Boîtiers caméra** → **Ouvrir la caméra**.
- **Updates are automatic:** every `git push` to `main` rebuilds Render and Vercel.
- **Wrong class times?** The server uses Tunisia time (`TZ=Africa/Tunis` in Render → service → **Environment**). Change it there if needed.
- **Start over with fresh demo data:** in Neon, delete and recreate the database (or the project), update `DATABASE_URL` in Render, then **Manual Deploy** → **Deploy latest commit**.

## If something goes wrong

| Problem | Solution |
|---|---|
| Website: *"Impossible de joindre le serveur"* | The Render service is waking up: wait 1 minute and retry. If it persists, check `VITE_API_URL` in Vercel (must end with `/api`), then **Redeploy** in Vercel. |
| Render logs: `Database connection failed` | `DATABASE_URL` is wrong: Render → service → **Environment** → paste the Neon string again → **Save**. |
| Render build fails | Open the logs, copy the last 20 lines and ask for help. |
| Login works locally but not online | Vercel address must end with `.vercel.app`. For another domain, add it to `CORS_ORIGIN` in Render → **Environment**. |
