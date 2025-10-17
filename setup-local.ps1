# PowerShell Setup Script for Tigray Marketplace
# Run this in PowerShell to set up environment files

Write-Host "🚀 Setting up Tigray Marketplace for local development..." -ForegroundColor Green
Write-Host ""

# Create server .env file
Write-Host "📝 Creating server/.env..." -ForegroundColor Yellow

$serverEnv = @"
NODE_ENV=development
PORT=3000

# Database (Docker Compose MongoDB)
MONGO_URI=mongodb://admin:password123@localhost:27017/tigray_marketplace?authSource=admin

# Redis (Docker Compose Redis)
REDIS_URL=redis://:redis123@localhost:6379

# JWT Secret (change in production)
JWT_SECRET=dev-jwt-secret-please-change-in-production-12345678

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# Cloudinary (REQUIRED - Add your credentials)
# Get from: https://cloudinary.com/console
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name

# S3 (Optional - leave as is if using Cloudinary)
USE_S3=false
AWS_S3_BUCKET=optional-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=optional
AWS_SECRET_ACCESS_KEY=optional
CLOUDFRONT_URL=optional

# Email (SMTP - using Mailtrap for development)
# Get free account at: https://mailtrap.io
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASS=your-mailtrap-password
SMTP_FROM=noreply@tigraymarket.com

# OTP Configuration
OTP_EXPIRY_MINUTES=5
OTP_DEV_MODE=true
"@

New-Item -Path "server" -ItemType Directory -Force | Out-Null
Set-Content -Path "server\.env" -Value $serverEnv

# Create worker .env file
Write-Host "📝 Creating worker/.env..." -ForegroundColor Yellow
New-Item -Path "worker" -ItemType Directory -Force | Out-Null
Copy-Item "server\.env" -Destination "worker\.env"

# Create client .env file
Write-Host "📝 Creating client/.env..." -ForegroundColor Yellow

$clientEnv = @"
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
"@

New-Item -Path "client" -ItemType Directory -Force | Out-Null
Set-Content -Path "client\.env" -Value $clientEnv

Write-Host ""
Write-Host "✅ Environment files created!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: You need to configure Cloudinary:" -ForegroundColor Yellow
Write-Host "   1. Sign up at https://cloudinary.com (free tier available)"
Write-Host "   2. Get your credentials from: https://cloudinary.com/console"
Write-Host "   3. Update CLOUDINARY_URL in server\.env and worker\.env"
Write-Host "   Format: cloudinary://api_key:api_secret@cloud_name"
Write-Host ""
Write-Host "📧 Optional: Configure email testing:" -ForegroundColor Cyan
Write-Host "   1. Sign up at https://mailtrap.io (free tier available)"
Write-Host "   2. Get SMTP credentials"
Write-Host "   3. Update SMTP_* variables in server\.env"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "   1. Update server\.env with your Cloudinary credentials"
Write-Host "   2. Run: docker-compose up -d"
Write-Host "   3. Wait for services to start (~30 seconds)"
Write-Host "   4. Open http://localhost:5173 in your browser"
Write-Host ""

