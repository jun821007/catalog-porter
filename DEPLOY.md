# Catalog Porter - Railway Deployment

## Prerequisites

- [Railway](https://railway.app) account
- Project pushed to GitHub

---

## Step 1: Create Project

1. Log in to [Railway](https://railway.app)
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `webot` repository
4. Railway will auto-detect the Dockerfile and begin building

---

## Step 2: Add Volume (Required for persistent data)

**Important:** Without a Volume, `catalog.json` and uploads are stored in the container filesystem and will be **lost on every redeploy or restart**.

1. In your Railway project, click your **Service**
2. Open the **Variables** tab
3. Find **Volumes** in the right panel (or under Service settings)
4. Click **+ Add Volume**
5. Set **Mount Path** to: `/data`
6. Save

The app uses `DATA_DIR=/data` (set in the Dockerfile). When the Volume is mounted at `/data`, all catalog data and uploaded images persist across deployments.

---

## Step 3: Environment Variables (optional)

- **PORT** – Railway sets this automatically, no action needed
- **DATA_DIR** – Already set to `/data` in the Dockerfile; no override needed when using the Volume

---

## Step 4: Deploy

- Railway builds from the Dockerfile and deploys automatically
- After deployment, go to **Settings** → **Networking** → **Generate Domain** to get a public URL (e.g. `https://your-app.up.railway.app`)

---

## Step 5: Verify

1. Open the generated domain
2. Add items to the catalog; they should persist after redeploy if the Volume is correctly mounted at `/data`

---

## Other Platforms

### Render

- Deploy using Docker
- Add a **Disk** in Render and mount it at `/data`

### Self-hosted VPS (e.g. DigitalOcean)

```bash
cd webot
docker build -t catalog-porter .
docker run -d -p 3000:3000 -v $(pwd)/data:/data catalog-porter
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Data lost after redeploy | Add a Volume with mount path `/data` |
| Puppeteer / Chromium errors | Dockerfile uses system Chromium; `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` is set |
| Build fails | Ensure `node_modules`, `data`, `.git` are in `.dockerignore` for faster, cleaner builds |
