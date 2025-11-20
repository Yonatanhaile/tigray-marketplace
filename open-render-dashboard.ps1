# Open Render Dashboard to Deploy
# This script opens your Render dashboard in the default browser

Write-Host "🚀 Opening Render Dashboard..." -ForegroundColor Green
Write-Host ""
Write-Host "Follow these steps:" -ForegroundColor Yellow
Write-Host "1. Click on 'tigray-marketplace-api' service" -ForegroundColor Cyan
Write-Host "2. Click 'Manual Deploy' button (top-right)" -ForegroundColor Cyan
Write-Host "3. Select 'Deploy latest commit'" -ForegroundColor Cyan
Write-Host "4. Click 'Deploy'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployment will take 3-5 minutes" -ForegroundColor Gray
Write-Host ""

# Open Render dashboard
Start-Process "https://dashboard.render.com/"

Write-Host "✅ Browser opened!" -ForegroundColor Green
Write-Host ""
Write-Host "After deployment completes:" -ForegroundColor Yellow
Write-Host "- Test your backend: https://your-service.onrender.com/health" -ForegroundColor Cyan
Write-Host "- Try registering a new user (should work without VPN errors!)" -ForegroundColor Cyan

