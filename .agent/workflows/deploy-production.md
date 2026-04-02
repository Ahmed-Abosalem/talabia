---
description: How to safely deploy updates to the Talabia production server
---
# Talabia Production Deployment Workflow

Follow these steps precisely to avoid the "White Screen" initialization error and ensure high performance.

1. **Verify Asset Size**:
   Run `cd frontend && npm run build` locally. 
   Verify that no chunk (except `vendor`) is larger than 1MB.

2. **Commit and Push**:
   // turbo
   `git add . ; git commit -m "Deployment: [Your Summary]" ; git push origin main`

3. **Remote Execution**:
   Run the following command in your terminal:
   `ssh root@165.232.127.15 "cd /root/talabia-app && git fetch origin main && git reset --hard origin/main && chmod +x deploy.sh && ./deploy.sh"`

4. **Verify Live Site**:
   - Visit https://talabia.net
   - Press Ctrl+F5 to clear cache.
   - Check Console (F12) for any "Initialization" errors.
