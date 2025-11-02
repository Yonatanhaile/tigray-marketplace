# Tigray Marketplace Development Startup Script
# This script starts the backend and frontend servers

Write-Host "🚀 Starting Tigray Marketplace..." -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running
Write-Host "📊 Checking MongoDB..." -ForegroundColor Yellow
$mongod = Get-Process -Name mongod -ErrorAction SilentlyContinue

if ($mongod) {
    Write-Host "✅ MongoDB is running (Process ID: $($mongod.Id))" -ForegroundColor Green
} else {
    Write-Host "❌ MongoDB is not running!" -ForegroundColor Red
    Write-Host "   Please start MongoDB first:" -ForegroundColor Yellow
    Write-Host "   - Windows Service: net start MongoDB" -ForegroundColor White
    Write-Host "   - Or run: mongod" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "⚙️  Starting services..." -ForegroundColor Cyan
Write-Host ""

# Check if .env exists in server directory
if (!(Test-Path "server\.env")) {
    Write-Host "⚠️  Warning: server\.env file not found!" -ForegroundColor Yellow
    Write-Host "   Creating default .env file..." -ForegroundColor Yellow
    
    $envContent = @"
# Server Configuration
NODE_ENV=development
PORT=3000

# Database Configuration
MONGO_URI=mongodb://localhost:27017/tigray_marketplace

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Backend URL
BACKEND_URL=http://localhost:3000
"@
    
    # Try to create the .env file
    try {
        Set-Content -Path "server\.env" -Value $envContent
        Write-Host "✅ Created server\.env file" -ForegroundColor Green
    } catch {
        Write-Host "❌ Could not create .env file automatically" -ForegroundColor Red
        Write-Host "   Please create server\.env manually with the following content:" -ForegroundColor Yellow
        Write-Host $envContent -ForegroundColor White
        Write-Host ""
        Write-Host "   Then run this script again." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host ""
Write-Host "📖 Instructions:" -ForegroundColor Cyan
Write-Host "   This script will open 2 terminal windows:" -ForegroundColor White
Write-Host "   1. Backend Server (http://localhost:3000)" -ForegroundColor White
Write-Host "   2. Frontend Client (http://localhost:5173)" -ForegroundColor White
Write-Host ""
Write-Host "   Keep both terminals open while developing." -ForegroundColor Yellow
Write-Host "   Press Ctrl+C in each terminal to stop the servers." -ForegroundColor Yellow
Write-Host ""

# Start Backend Server
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\server'; Write-Host '🔧 Backend Server' -ForegroundColor Cyan; Write-Host ''; npm run dev"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start Frontend Client
Write-Host "🎨 Starting Frontend Client..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\client'; Write-Host '🎨 Frontend Client' -ForegroundColor Cyan; Write-Host ''; npm run dev"

Write-Host ""
Write-Host "✅ Services are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "   API:      http://localhost:3000/api" -ForegroundColor White
Write-Host ""
Write-Host "📝 Watch the server logs for message debugging!" -ForegroundColor Yellow
Write-Host "   Look for: 📨 💾 ✅ 📤 emojis when sending messages" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this window (servers will keep running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

