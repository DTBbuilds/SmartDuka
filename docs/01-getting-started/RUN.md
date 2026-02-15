# How to Run SmartDuka

**Quick Start - Choose One Method**

---

## Method 1: Simple Command (Recommended)

From the project root (`e:\BUILds\SmartDuka`), run:

```powershell
pnpm dev
```

This will start both servers in parallel using Turbo.

**Expected Output:**
```
@smartduka/web:dev: ▲ Next.js 16.0.1
@smartduka/web:dev: - Local: http://localhost:3000

@smartduka/api:dev: 🚀 Backend API running on http://localhost:5000
```

---

## Method 2: Interactive Menu (PowerShell)

```powershell
.\dev-menu.ps1
```

Then select option 1 to start both servers.

---

## Method 3: Separate Terminals

### Terminal 1 - Backend:
```powershell
cd apps/api
pnpm dev
```

### Terminal 2 - Frontend:
```powershell
cd apps/web
pnpm dev
```

---

## Method 4: Batch File (Windows Command Prompt)

```cmd
start-dev.bat
```

---

## Access the Application

Once both servers are running:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000

---

## Troubleshooting

### Issue: "pnpm: command not found"

**Solution:** Install pnpm globally
```powershell
npm install -g pnpm
```

### Issue: "Port 3000 already in use"

**Solution:** Kill the process using port 3000
```powershell
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

### Issue: "Port 5000 already in use"

**Solution:** Kill the process using port 5000
```powershell
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>
```

### Issue: Dependencies not installed

**Solution:**
```powershell
pnpm install
```

---

## ✅ Everything Ready!

Just run:

```powershell
pnpm dev
```

And open http://localhost:3000 in your browser!
