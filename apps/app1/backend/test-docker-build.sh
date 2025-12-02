#!/bin/bash

echo "🐳 Testing Multi-Stage Docker Build..."

# Test development stage
echo "📦 Building development stage..."
docker build --target development -t mas3ndi-backend:dev .

if [ $? -eq 0 ]; then
    echo "✅ Development stage built successfully"
else
    echo "❌ Development stage build failed"
    exit 1
fi

# Test build stage
echo "📦 Building build stage..."
docker build --target build -t mas3ndi-backend:build .

if [ $? -eq 0 ]; then
    echo "✅ Build stage built successfully"
else
    echo "❌ Build stage build failed"
    exit 1
fi

# Test production stage (default)
echo "📦 Building production stage..."
docker build --target production -t mas3ndi-backend:prod .

if [ $? -eq 0 ]; then
    echo "✅ Production stage built successfully"
else
    echo "❌ Production stage build failed"
    exit 1
fi

echo "🎉 All Docker stages built successfully!"

# Show image sizes
echo "📊 Image sizes:"
docker images | grep mas3ndi-backend
