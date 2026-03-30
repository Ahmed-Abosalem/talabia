#!/bin/bash

# ========================================================
# 🚀 Talabia Master Deployment Script (VPS)
# ========================================================
# This script automates the deployment of the updated Talabia platform.
# Usage: chmod +x deploy.sh && ./deploy.sh

# --- Configuration ---
PROJECT_NAME="Talabia Platform"
BACKEND_DIR="./backend"
FRONTEND_DIR="./frontend"
PM2_PROCESS_NAME="talabia-api"

echo "--------------------------------------------------------"
echo "  Starting Deployment for ${PROJECT_NAME}..."
echo "--------------------------------------------------------"

# 1. Pull latest code from GitHub (Production Branch: main)
echo "📥 1/4 Pulling latest changes from main branch..."
git pull origin main

# 2. Update Backend
echo "⚙️  2/4 Updating Backend..."
cd $BACKEND_DIR
npm install --production

# Restart PM2 process
if pm2 show $PM2_PROCESS_NAME > /dev/null; then
    echo "🔄 Restarting existing PM2 process: ${PM2_PROCESS_NAME}"
    pm2 restart $PM2_PROCESS_NAME
else
    echo "▶️  Starting new PM2 process: ${PM2_PROCESS_NAME}"
    pm2 start server.js --name $PM2_PROCESS_NAME
fi

# 3. Update Frontend
echo "🎨 3/4 Updating Frontend (Building React App)..."
cd ../$FRONTEND_DIR
npm install
npm run build

# 4. Sync to Nginx Root
NGINX_ROOT="/var/www/talabia/frontend"
echo "🚛 4/4 Syncing files to Nginx Root: ${NGINX_ROOT}"

# Ensure it exists
mkdir -p $NGINX_ROOT

# Copy files (overwrite)
cp -rv dist/* $NGINX_ROOT/

echo "--------------------------------------------------------"
echo "✅ Deployment Successful!"
echo "--------------------------------------------------------"
echo "🌐 Site: https://talabia.net"
echo "📊 PM2 Status:"
pm2 status $PM2_PROCESS_NAME
echo "--------------------------------------------------------"
echo "💡 The new UI is now live at ${NGINX_ROOT}"
