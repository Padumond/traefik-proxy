#!/usr/bin/env pwsh

Write-Host "🐳 Testing Multi-Stage Docker Build..." -ForegroundColor Cyan

# Test development stage
Write-Host "📦 Building development stage..." -ForegroundColor Yellow
docker build --target development -t mas3ndi-backend:dev .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Development stage built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Development stage build failed" -ForegroundColor Red
    exit 1
}

# Test build stage
Write-Host "📦 Building build stage..." -ForegroundColor Yellow
docker build --target build -t mas3ndi-backend:build .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build stage built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Build stage build failed" -ForegroundColor Red
    exit 1
}

# Test production stage (default)
Write-Host "📦 Building production stage..." -ForegroundColor Yellow
docker build --target production -t mas3ndi-backend:prod .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Production stage built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Production stage build failed" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 All Docker stages built successfully!" -ForegroundColor Green

# Show image sizes
Write-Host "📊 Image sizes:" -ForegroundColor Cyan
docker images | Select-String "mas3ndi-backend"
