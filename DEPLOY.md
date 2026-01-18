# 🚀 Quick Netlify Deploy

## One-Click Deploy

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/DocComfort/HCP-Inventory-Management-APP)

---

## Manual Deploy Steps

### 1. Connect Repository
1. Login to [Netlify](https://app.netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Choose **GitHub** → Select **HCP-Inventory-Management-APP**

### 2. Configure Build
Build settings are auto-detected from `netlify.toml`:
- ✅ Build command: `npm run build`
- ✅ Publish directory: `dist`
- ✅ Node version: 18

### 3. Add Environment Variables
In Netlify Dashboard → **Site Settings → Environment Variables**, add:

```bash
VITE_SUPABASE_URL=https://eawumdjrcwvydvfejkwo.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=https://your-backend.railway.app
```

### 4. Deploy!
Click **Deploy site** - First build takes ~2-3 minutes

---

## ⚡ Build Status

✅ **Frontend:** Builds successfully with no errors  
✅ **Bundle size:** 705 KB (gzipped: 189 KB)  
✅ **TypeScript:** Compiles cleanly  
✅ **Dependencies:** All installed and working  

---

## 🔧 Post-Deploy Configuration

### Backend Deployment
Deploy the `/backend` folder separately:
- **Railway:** [Guide](./NETLIFY_DEPLOY.md#option-a-railway-recommended)
- **Render:** [Guide](./NETLIFY_DEPLOY.md#option-b-render)
- **Heroku:** [Guide](./NETLIFY_DEPLOY.md#option-c-heroku)

### Update API URL
After backend is deployed, update in Netlify:
```
VITE_API_URL=https://your-deployed-backend.com
```
Then **Redeploy** the frontend.

---

## 📊 What's Deployed

- **Frontend:** React + Vite + TypeScript
- **UI:** Shadcn/ui components
- **Database:** Supabase PostgreSQL
- **Features:**
  - ✅ Inventory management
  - ✅ HCP webhook integration
  - ✅ QuickBooks sync (QBO + QBD)
  - ✅ Real-time updates
  - ✅ Labor tracking
  - ✅ Material deduction

---

## 🛠️ Troubleshooting

**Build fails?** Check environment variables are set  
**Runtime errors?** Verify `VITE_API_URL` points to deployed backend  
**404 on refresh?** netlify.toml redirects should handle this automatically  

**Full guide:** [NETLIFY_DEPLOY.md](./NETLIFY_DEPLOY.md)

---

## 📞 Need Help?

- Check [HCP_INTEGRATION_SUMMARY.md](./HCP_INTEGRATION_SUMMARY.md) for technical details
- Review [HCP_QUICK_SETUP.md](./HCP_QUICK_SETUP.md) for HCP setup
- Open an issue on GitHub
