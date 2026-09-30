# LifeOS 90 — Free Hosting & Mobile Access Guide

This guide explains how to host LifeOS 90 for **100% FREE** so you can use it on your mobile phone anywhere.

---

## ⚠️ Important Note About SQLite & Free Cloud Hosts

LifeOS 90 stores your schedule, streaks, reviews, and finances in a local SQLite database (`database/lifeos.db`).
- **Render / Vercel Free Tiers**: Render free tier disks are **ephemeral** (wiped clean every time the service restarts or sleeps). Vercel is serverless and cannot write to SQLite files.
- To keep your data safe for free, use either **Method 1 (Cloudflare Tunnel from your PC)** or **Method 2 (Fly.io with a free persistent volume)**.

---

## Method 1: Cloudflare Tunnel (Recommended — 100% Free, Zero Setup Fees, Data Stays on Your PC)

Cloudflare provides a free tool called `cloudflared` that creates a secure public `https://...` tunnel directly to your running LifeOS 90 app. You do not need a domain name, credit card, or router port-forwarding.

### Step 1: Build the Frontend Once
In a terminal, run:
```powershell
cd c:\santhosh_repos\my-_self_tracker\frontend
npm run build
```

### Step 2: Start the Unified App
Start the backend on port 8000 (which now automatically serves the built frontend):
```powershell
cd c:\santhosh_repos\my-_self_tracker\backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Step 3: Run Cloudflare Tunnel
Download the official single-file `cloudflared.exe` from Cloudflare:
- Download link: [https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe](https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe)
- Place it in your project folder, or run:
```powershell
winget install --id Cloudflare.cloudflared
```
Then run:
```powershell
cloudflared tunnel --url http://localhost:8000
```

### Step 4: Open on Your Phone
Cloudflare will output a public URL like:
```
https://random-words-here.trycloudflare.com
```
Open that link on your phone’s browser (Safari or Chrome) from anywhere in the world on 4G, 5G, or Wi-Fi! Tap **"Add to Home Screen"** to use it like a native app.

---

## Method 2: 24/7 Cloud Hosting on Fly.io (Free Tier with Persistent SQLite Disk)

If you want the app to run **24/7 in the cloud** even when your computer is turned off, Fly.io provides a generous free allowance with persistent disk volumes.

### Step 1: Install Fly CLI
Open PowerShell and run:
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### Step 2: Login or Sign Up
```bash
fly auth signup
# or
fly auth login
```

### Step 3: Create Free 1GB Persistent Volume for SQLite
In your project directory:
```bash
fly volumes create lifeos_data --region sin --size 1
```

### Step 4: Deploy
```bash
fly deploy
```

Fly.io will build the Docker container and output your live URL:
```
https://lifeos-90.fly.dev
```
Open this URL on your phone. Because of the persistent volume `lifeos_data`, all your logged data will stay safe forever!

---

## Method 3: Local Home Wi-Fi (No Internet Needed)

If you only use the app at home:
1. Double-click `start.bat`.
2. Connect your phone to your home Wi-Fi.
3. Open `http://<your-pc-ip>:5173` on your phone browser.
