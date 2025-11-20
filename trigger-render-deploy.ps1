# Trigger Render Deployment via Deploy Hook
# 
# To use this script:
# 1. Go to Render Dashboard → Your Service → Settings
# 2. Scroll to "Deploy Hook" section
# 3. Copy the Deploy Hook URL
# 4. Run: $env:RENDER_DEPLOY_HOOK="your-hook-url-here"
# 5. Then run this script: .\trigger-render-deploy.ps1

param(
    [string]$DeployHookUrl = $env:RENDER_DEPLOY_HOOK
)

if (-not $DeployHookUrl) {
    Write-Host "❌ ERROR: Deploy Hook URL not provided" -ForegroundColor Red
    Write-Host ""
    Write-Host "To get your Deploy Hook URL:" -ForegroundColor Yellow
    Write-Host "1. Go to https://dashboard.render.com/" -ForegroundColor Cyan
    Write-Host "2. Select your service: tigray-marketplace-api" -ForegroundColor Cyan
    Write-Host "3. Go to Settings → Deploy Hook" -ForegroundColor Cyan
    Write-Host "4. Copy the Deploy Hook URL" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Then run:" -ForegroundColor Yellow
    Write-Host '  $env:RENDER_DEPLOY_HOOK="your-hook-url-here"' -ForegroundColor Cyan
    Write-Host "  .\trigger-render-deploy.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "OR pass it directly:" -ForegroundColor Yellow
    Write-Host '  .\trigger-render-deploy.ps1 -DeployHookUrl "your-hook-url-here"' -ForegroundColor Cyan
    exit 1
}

Write-Host "🚀 Triggering Render deployment..." -ForegroundColor Green

try {
    $response = Invoke-WebRequest -Uri $DeployHookUrl -Method POST -UseBasicParsing
    
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 201) {
        Write-Host "✅ Deployment triggered successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Check deployment status at:" -ForegroundColor Yellow
        Write-Host "https://dashboard.render.com/" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Deployment usually takes 3-5 minutes" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Unexpected response: $($response.StatusCode)" -ForegroundColor Yellow
        Write-Host $response.Content
    }
} catch {
    Write-Host "❌ Failed to trigger deployment" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Please verify:" -ForegroundColor Yellow
    Write-Host "1. The Deploy Hook URL is correct" -ForegroundColor Cyan
    Write-Host "2. You have internet connectivity" -ForegroundColor Cyan
    Write-Host "3. The Render service is active" -ForegroundColor Cyan
    exit 1
}

