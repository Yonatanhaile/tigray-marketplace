#!/bin/bash

# Local Setup Script for Tigray Marketplace
# This script sets up environment files for local development

echo "🚀 Setting up Tigray Marketplace for local development..."
echo ""

# Create server .env file
echo "📝 Creating server/.env..."
cat > server/.env << 'EOF'
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
EOF

# Create worker .env file (same as server for simplicity)
echo "📝 Creating worker/.env..."
cp server/.env worker/.env

# Create client .env file
echo "📝 Creating client/.env..."
cat > client/.env << 'EOF'
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
EOF

echo ""
echo "✅ Environment files created!"
echo ""
echo "⚠️  IMPORTANT: You need to configure Cloudinary:"
echo "   1. Sign up at https://cloudinary.com (free tier available)"
echo "   2. Get your credentials from: https://cloudinary.com/console"
echo "   3. Update CLOUDINARY_URL in server/.env and worker/.env"
echo "   Format: cloudinary://api_key:api_secret@cloud_name"
echo ""
echo "📧 Optional: Configure email testing:"
echo "   1. Sign up at https://mailtrap.io (free tier available)"
echo "   2. Get SMTP credentials"
echo "   3. Update SMTP_* variables in server/.env"
echo ""
echo "Next steps:"
echo "   1. Update server/.env with your Cloudinary credentials"
echo "   2. Run: docker-compose up -d"
echo "   3. Wait for services to start (~30 seconds)"
echo "   4. Open http://localhost:5173 in your browser"
echo ""

