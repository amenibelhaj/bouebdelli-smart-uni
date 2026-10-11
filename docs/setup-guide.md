# Setup guide (WSL + VS Code, step by step)

This guide installs and runs **Bouebdelli Smart Uni** on a Windows laptop with **WSL (Ubuntu)** and **VS Code**, starting from zero.

Every step is copy-paste: copy the whole grey block, paste it in the WSL terminal (**right-click** or **Ctrl+Shift+V**), press **Enter**, and wait until it finishes before the next block.

The first time takes about 30 minutes. After that, starting the project takes 1 minute ([see the end](#next-time-start-the-project-in-1-minute)).

When a command asks for **`[sudo] password`**, type your **WSL (Ubuntu) password** and press Enter. Nothing appears while you type: that's normal.

---

## Step 1 — Open the WSL terminal

Start menu → type **Ubuntu** → open it. You get a line ending with `$`. All commands below go here (or in a VS Code terminal later).

---

## Step 2 — Install the tools (once)

### 2a. Base tools, Python and PostgreSQL

```bash
sudo apt update
sudo apt install -y git curl python3 python3-venv python3-pip postgresql libgl1 libglib2.0-0
```

### 2b. Node.js

Check the version you have:

```bash
node -v
```

If it prints **v18** or higher (v18, v20, v22…), skip to step 3.
If it prints a lower version or *"command not found"*, install Node 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

---

## Step 3 — Start PostgreSQL and create the database (once)

```bash
sudo service postgresql start
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'smartuni';"
sudo -u postgres psql -c "CREATE DATABASE bouebdelli_smart_uni;"
```

✅ You should see `ALTER ROLE` then `CREATE DATABASE` (or *already exists*, which is fine).

> This sets the database password to `smartuni` on your laptop. The rest of the guide uses it, so you don't have to edit anything.

---

## Step 4 — Get the project

### If you have never downloaded the project

```bash
cd ~
git clone https://github.com/amenibelhaj/bouebdelli-smart-uni.git
cd ~/bouebdelli-smart-uni
```

### If you already have the project folder in WSL

```bash
cd ~/bouebdelli-smart-uni
cp backend/.env ~/old-backend.env 2>/dev/null
git pull
```

---

## Step 5 — Open it in VS Code

```bash
cd ~/bouebdelli-smart-uni
code .
```

VS Code opens the project (bottom-left corner shows **WSL: Ubuntu**).
Open a terminal in VS Code: menu **Terminal → New Terminal**.

You will need **3 terminals** at the same time, one per part of the project. Create a new one with the **+** button at the top right of the terminal panel.

---

## Step 6 — Backend (terminal 1)

Create the settings file (this block writes it for you, including a random secret):

```bash
cd ~/bouebdelli-smart-uni/backend
cat > .env << EOF
DB_NAME=bouebdelli_smart_uni
DB_USER=postgres
DB_PASSWORD=smartuni
DB_HOST=localhost
DB_PORT=5432

PORT=5000
JWT_SECRET=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
TZ=Africa/Tunis

AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_KEY=ameni-ai-2026

CHECKIN_EARLY_MINUTES=15
EOF
cat .env
```

✅ You should see the settings printed, with a long random `JWT_SECRET`.

> **Clock:** `TZ=Africa/Tunis` is for a laptop showing Tunisia time. If your Windows clock shows **Paris** time, run: `sed -i 's#^TZ=.*#TZ=Europe/Paris#' .env`

Install, fill the database with demo data, and start:

```bash
npm install
npm run seed
npm run dev
```

✅ It works when you see **`Server running on port 5000`**.
Leave this terminal open.

> `npm run seed` fills the database with demo data. Run it only once: running it again **erases everything** and starts over.

---

## Step 7 — Face recognition service (terminal 2)

Open a **new terminal** (**+** button), then:

```bash
cd ~/bouebdelli-smart-uni/ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python download_models.py
```

✅ You should see **`(venv)`** at the start of the line, and at the end **`Models ready.`**

Create its settings file and start it:

```bash
cat > .env << 'EOF'
AI_HOST=127.0.0.1
AI_PORT=8000
AI_SERVICE_KEY=ameni-ai-2026
FACE_MATCH_THRESHOLD=0.40
BACKEND_URL=http://localhost:5000/api
DEVICE_KEY=demo-key-b6
CAMERA_INDEX=0
EOF
python app.py
```

✅ It works when you see **`Running on http://127.0.0.1:8000`**. Leave this terminal open.

---

## Step 8 — Website (terminal 3)

Open a **new terminal**, then:

```bash
cd ~/bouebdelli-smart-uni/frontend
npm install
npm run dev
```

✅ When you see **`Local: http://localhost:5173/`**, open **http://localhost:5173** in Chrome or Edge on Windows.

---

## Step 9 — Log in

Every demo account uses the password **`password123`**.

| Role | Email |
|---|---|
| Administration | `admin@smartuni.com` |
| Teacher | `sonia@smartuni.com` |
| Student | `ameni@smartuni.com` |

A student or teacher without a registered face is asked to take 3 photos with the webcam at the first login (**Mon visage**).

### Test the camera at the door

1. As admin → **Emploi du temps** → **Ajouter un cours**: choose a group, room **B6**, today's day, a start time a few minutes ago and an end time later.
2. Log in as a student of that group and register the face (**Mon visage**).
3. As admin → **Boîtiers caméra** → on *Caméra porte B6* → **Ouvrir la caméra** → **Démarrer la caméra** → allow the webcam.
4. Stand in front of the webcam: *"Bienvenue … — présence enregistrée"* appears.

---

## Next time: start the project in 1 minute

Open Ubuntu, then:

```bash
sudo service postgresql start
cd ~/bouebdelli-smart-uni
code .
```

In VS Code, start the 3 parts, each in its own terminal:

**Terminal 1**
```bash
cd ~/bouebdelli-smart-uni/backend && npm run dev
```

**Terminal 2**
```bash
cd ~/bouebdelli-smart-uni/ai-service && source venv/bin/activate && python app.py
```

**Terminal 3**
```bash
cd ~/bouebdelli-smart-uni/frontend && npm run dev
```

Then open http://localhost:5173.

### When the project is updated on GitHub

Stop the 3 terminals (**Ctrl+C** in each), then:

```bash
cd ~/bouebdelli-smart-uni
git pull
cd backend && npm install && cd ../frontend && npm install && cd ..
```

and start the 3 parts again.

---

## Problems and solutions

| You see | Solution |
|---|---|
| `ECONNREFUSED 127.0.0.1:5432` (terminal 1) | PostgreSQL is not started: `sudo service postgresql start`, then `npm run dev` again. |
| `password authentication failed` | Redo step 3, then `npm run dev` again. |
| `database "bouebdelli_smart_uni" does not exist` | Redo step 3. |
| `JWT_SECRET is missing` or `injected env (0)` | The `.env` file is empty: redo the first block of step 6. |
| `vite: not found` (terminal 3) | `npm install --include=dev` then `npm run dev`. |
| `libGL.so.1: cannot open shared object file` | `sudo apt install -y libgl1 libglib2.0-0` then `python app.py`. |
| `ensurepip is not available` | `sudo apt install -y python3-venv` then redo step 7. |
| Website: *"Impossible de joindre le serveur"* | Terminal 1 is not running. Start it again. |
| Website: *"Service de reconnaissance faciale injoignable"* | Terminal 2 is not running, or `AI_SERVICE_KEY` differs between the two `.env` files. |
| Camera page: *"Aucun cours en ce moment dans cette salle"* | No class is happening now in that room: add one (step 9). Also check `TZ` in `backend/.env` matches your Windows clock (step 6). |
| `Port 5000 is already in use` | Another backend is still running: `pkill -f "src/server.js"` then `npm run dev`. |

The webcam is used through the browser (the **Ouvrir la caméra** page), so it works even though WSL itself cannot access the camera.
