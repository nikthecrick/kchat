#!/bin/bash

# =================================================================
# Passk Chat - Quick Setup Verification Script
# =================================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔐 Passk Chat Setup Verification${NC}"
echo -e "${BLUE}================================${NC}"

# Check if we're in the right directory
if [ ! -f "deploy-ubuntu.sh" ]; then
    echo -e "${RED}Error: deploy-ubuntu.sh not found!${NC}"
    echo -e "${YELLOW}Make sure you're in the Passk project directory.${NC}"
    exit 1
fi

# Show current configuration
echo -e "${GREEN}Current Configuration:${NC}"
echo "Domain: kchat.nikniksen.de"
echo "User: z"
echo "App Directory: /home/z/passk"
echo ""

# Check if .env exists
if [ -f "/home/z/passk/.env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    echo -e "${BLUE}Current environment variables:${NC}"
    cat /home/z/passk/.env | grep -v "JWT_SECRET" | head -5
else
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
fi

echo ""
echo -e "${GREEN}Ready to deploy!${NC}"
echo -e "${YELLOW}Run this to start deployment:${NC}"
echo -e "${BLUE}./deploy-ubuntu.sh${NC}"
echo ""

echo -e "${BLUE}Features:${NC}"
echo "✅ Automated JWT secret generation"
echo "✅ Relative database path (./db/custom.db)"
echo "✅ SSL certificate setup with certbot"
echo "✅ PM2 process management"
echo "✅ Firewall configuration"
echo "✅ Nginx reverse proxy"