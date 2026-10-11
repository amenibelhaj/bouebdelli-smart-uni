# Setup guide (Windows, step by step)

This guide installs and runs **Bouebdelli Smart Uni** on a Windows laptop, starting from zero.
Follow the steps in order. Copy each command, paste it, and press **Enter**.

It takes about 30 minutes the first time. After that, starting the project takes 1 minute ([see the end](#next-time-start-the-project-in-1-minute)).

---

## Step 1 — Install the tools (once)

Install these 4 programs. Skip any you already have.

| Program | Where | Important during install |
|---|---|---|
| **Git** | https://git-scm.com/download/win | Keep the default options |
| **Node.js** (LTS version) | https://nodejs.org | Keep the default options |
| **Python** (3.10 or newer) | https://www.python.org/downloads/ | ✅ Tick **"Add python.exe to PATH"** on the first screen |
| **PostgreSQL** | https://www.postgresql.org/download/windows/ | Choose a password for the `postgres` user and **write it down**. Keep port `5432`. |

**VS Code** (https://code.visualstudio.com) is recommended to open the project.

**Restart your computer** after installing everything.

### Check that it worked

Open **PowerShell** (Start menu → type *PowerShell*) and run:

```powershell
git --version
node -v
python --version
```

Each line must print a version number. If one says *"not recognized"*, reinstall that program.

---

## Step 2 — Get the project

### If you have never downloaded the project

In PowerShell:

```powershell
cd $HOME\Desktop
git clone https://github.com/amenibelhaj/bouebdelli-smart-uni.git
cd bouebdelli-smart-uni
```

### If you already have the project folder

⚠️ First, save your old `backend\.env` file if you have one (the update deletes it). In PowerShell, inside the project folder:

```powershell
copy backend\.env $HOME\Desktop\old-backend.env
git pull
```

---

## Step 3 — Open the project in VS Code

In VS Code: **File → Open Folder** → choose the `bouebdelli-smart-uni` folder.

Open a terminal: menu **Terminal → New Terminal**. All the next commands are typed in VS Code terminals.

You will need **3 terminals** open at the same time (one per part of the project). Create a new one with the **+** button at the top right of the terminal panel.

---

## Step 4 — Create the database (once)

1. Open **pgAdmin** (installed with PostgreSQL, in the Start menu).
2. Click **Servers → PostgreSQL**, enter your postgres password.
3. Right-click **Databases → Create → Database…**
4. Name: `bouebdelli_smart_uni` → **Save**.

---

## Step 5 — Backend (terminal 1)

```powershell
cd backend
copy .env.example .env
notepad .env
```

Notepad opens the settings file. Change only these lines, then **save (Ctrl+S)** and close Notepad:

| Line | Put |
|---|---|
| `DB_PASSWORD=` | your PostgreSQL password from step 1 |
| `JWT_SECRET=` | any long random text (at least 30 characters), e.g. `k8Hq2mZp9xLw4vRt7nYc3bGf6sJd1aQe5uWo0iTz` |
| `AI_SERVICE_KEY=` | `ameni-ai-2026` |
| `TZ=` | `Africa/Tunis` if your computer clock is on Tunisia time, `Europe/Paris` if it is on Paris time |

Then:

```powershell
npm install
npm run seed
npm run dev
```

✅ It works when you see **`Server running on port 5000`**.
Leave this terminal open. Do not close it while using the website.

> `npm run seed` fills the database with demo data. Run it only once: running it again **erases everything** and starts over.

---

## Step 6 — Face recognition service (terminal 2)

Open a **new terminal** (**+** button), then:

```powershell
cd ai-service
python -m venv venv
venv\Scripts\activate
```

If you see *"running scripts is disabled on this system"*, run this once, then run `venv\Scripts\activate` again:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

✅ You should now see **`(venv)`** at the start of the line. Then:

```powershell
pip install -r requirements.txt
python download_models.py
copy .env.example .env
notepad .env
```

In Notepad, set the same key as in step 5, save and close:

```
AI_SERVICE_KEY=ameni-ai-2026
```

Start the service:

```powershell
python app.py
```

✅ It works when you see **`Face recognition service on http://127.0.0.1:8000`**. Leave this terminal open.

---

## Step 7 — Website (terminal 3)

Open a **new terminal**, then:

```powershell
cd frontend
npm install
npm run dev
```

✅ When you see **`Local: http://localhost:5173/`**, open **http://localhost:5173** in Chrome or Edge.

---

## Step 8 — Log in

Every demo account uses the password **`password123`**.

| Role | Email |
|---|---|
| Administration | `admin@smartuni.com` |
| Teacher | `sonia@smartuni.com` |
| Student | `ameni@smartuni.com` |

A student or teacher without a registered face is asked to take 3 photos with the webcam at the first login (**Mon visage**).

### Test the camera at the door

1. As admin → **Emploi du temps** → **Ajouter un cours**: choose a group, room **B6**, today's day, a start time a few minutes ago and an end time later.
2. Log in once as a student of that group and register the face (**Mon visage**).
3. As admin → **Boîtiers caméra** → on *Caméra porte B6* → **Ouvrir la caméra** → **Démarrer la caméra**.
4. Stand in front of the webcam: *"Bienvenue … — présence enregistrée"* appears.

---

## Next time: start the project in 1 minute

Open the project in VS Code and start the 3 parts, each in its own terminal:

**Terminal 1**
```powershell
cd backend
npm run dev
```

**Terminal 2**
```powershell
cd ai-service
venv\Scripts\activate
python app.py
```

**Terminal 3**
```powershell
cd frontend
npm run dev
```

Then open http://localhost:5173.

### When the project is updated on GitHub

Stop the 3 terminals (**Ctrl+C** in each), then in a terminal at the project root:

```powershell
git pull
cd backend
npm install
cd ..\frontend
npm install
cd ..
```

and start the 3 parts again.

---

## Problems and solutions

| You see | Solution |
|---|---|
| `password authentication failed` (terminal 1) | Wrong `DB_PASSWORD` in `backend\.env`. Fix it, save, run the command again. |
| `database "bouebdelli_smart_uni" does not exist` | Do step 4 (create the database in pgAdmin). |
| `JWT_SECRET is missing` | `backend\.env` is empty or not saved. Redo step 5 and press Ctrl+S in Notepad. |
| `'vite' is not recognized` (terminal 3) | Run `npm install --include=dev` in `frontend`, then `npm run dev`. |
| Website: *"Impossible de joindre le serveur"* | Terminal 1 is not running. Start it (`cd backend` then `npm run dev`). |
| Website: *"Service de reconnaissance faciale injoignable"* | Terminal 2 is not running, or `AI_SERVICE_KEY` is not the same in both `.env` files. |
| Camera page: *"Aucun cours en ce moment dans cette salle"* | No class is happening now in that room. Add one (step 8), and check `TZ` in `backend\.env` matches your clock. |
| `python` is not recognized | Reinstall Python and tick **"Add python.exe to PATH"**. |

**On Mac or Linux**, the commands are the same except: use `python3` instead of `python`, `source venv/bin/activate` instead of `venv\Scripts\activate`, and `cp` instead of `copy`.
