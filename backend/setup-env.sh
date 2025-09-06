#!/bin/bash

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rtc_docs
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_IS_SSL=false

# Redis Configuration
REDIS_HOSTNAME=localhost
REDIS_PORT=6379
REDIS_USERNAME=redisuser
REDIS_PASSWORD=redispass123
REDIS_DB=0
REDIS_IS_TLS=false

# Server Configuration
PORT=3001
NODE_ENV=development
EOF
    echo "✅ .env file created successfully"
else
    echo "⚠️  .env file already exists"
fi

echo "🚀 You can now run: yarn docker:up"
