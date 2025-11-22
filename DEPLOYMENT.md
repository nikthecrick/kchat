# 🚀 Passk Chat - Ubuntu Server Deployment Guide

## 📋 Prerequisites
- Fresh Ubuntu 20.04+ server
- Domain name pointing to your server (kchat.nikniksen.de)
- SSH access with sudo privileges

## 🎯 Quick Deployment Steps

### 1. **Run the Deployment Script**
```bash
# Download and run the deployment script
curl -fsSL https://raw.githubusercontent.com/yourusername/passk/main/deploy-ubuntu.sh | bash

# Or clone and run manually:
git clone https://github.com/yourusername/passk.git
cd passk
chmod +x deploy-ubuntu.sh
./deploy-ubuntu.sh
```

### 2. **Manual SSL Setup** (if certbot fails)
```bash
# Install SSL certificates manually
sudo mkdir -p /etc/ssl/private
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/$DOMAIN.key \
  -out /etc/ssl/certs/$DOMAIN.crt

# Update nginx config to use these certificates
# Edit /etc/nginx/sites-available/kchat.nikniksen.de
# Change ssl_certificate and ssl_certificate_key paths
```

### 3. **Test the Application**
```bash
# Check if service is running
sudo -u z pm2 status passk-chat

# View logs
sudo -u z pm2 logs passk-chat

# Restart application
restart-passk
```

## 🔧 What the Script Does

### ✅ **Automatically Installs:**
- Node.js 22.x (latest LTS)
- npm and yarn package managers
- nginx web server
- certbot for SSL certificates
- PM2 for process management
- git for version control

### ✅ **Configures:**
- Application user (`z`)
- Nginx reverse proxy configuration
- SSL certificates with Let's Encrypt
- PM2 process management
- Firewall rules (UFW)
- Environment variables
- Log rotation

### ✅ **Sets Up:**
- Clones your repository
- Installs dependencies
- Builds the application
- Configures production environment
- Starts the application with PM2

## 📁 File Structure Created

```
/home/z/
├── passk/                    # Application directory
│   ├── .env                 # Environment variables
│   ├── ecosystem.config.json   # PM2 configuration
│   ├── logs/                 # Application logs
│   └── .next/standalone/     # Built application
├── etc/
│   ├── nginx/
│   │   ├── sites-available/
│   │   │   └── kchat.nikniksen.de
│   │   └── sites-enabled/
│   │       └── kchat.nikniksen.de -> ../sites-available/kchat.nikniksen.de
│   └── letsencrypt/live/kchat.nikniksen.de/  # SSL certificates
└── usr/local/bin/
    ├── restart-passk          # Restart script
    └── passk-logs           # Log viewer script
```

## 🔐 Security Configuration

### **Environment Variables:**
- `RP_ID=kchat.nikniksen.de` - Passkey domain
- `ORIGIN=https://kchat.nikniksen.de` - Application origin
- `JWT_SECRET` - Auto-generated secure secret
- `NODE_ENV=production` - Production mode

### **SSL Configuration:**
- Let's Encrypt certificates (auto-renewal)
- HTTPS-only access (HTTP redirects to HTTPS)
- Strong SSL ciphers and protocols

### **Firewall Rules:**
- Port 22 (SSH)
- Port 80 (HTTP redirect)
- Port 443 (HTTPS)
- Port 3000 (internal app)

## 🚀 Application Access

- **Main Application**: https://kchat.nikniksen.de
- **Admin Access**: SSH to server
- **Process Management**: PM2 commands
- **Log Access**: `passk-logs` command

## 🔄 Maintenance Commands

### **Update Application:**
```bash
cd /home/z/passk
git pull
sudo -u z pm2 restart passk-chat
```

### **View Logs:**
```bash
# Real-time logs
passk-logs

# PM2 status
sudo -u z pm2 status passk-chat

# PM2 monitor
sudo -u z pm2 monit
```

### **Backup Database:**
```bash
cp /home/z/passk/db/custom.db /home/z/passk/db/backup-$(date +%Y%m%d).db
```

## 🎯 Post-Deployment Checklist

- [ ] Application loads at https://kchat.nikniksen.de
- [ ] SSL certificate is valid (check browser padlock)
- [ ] User registration works with passkeys
- [ ] Chat functionality works end-to-end
- [ ] WebSocket connections work
- [ ] PM2 process is stable
- [ ] Logs are being written
- [ ] Firewall is active
- [ ] SSL auto-renewal is configured

## 🆘 Troubleshooting

### **Application Not Starting:**
```bash
# Check PM2 status
sudo -u z pm2 status passk-chat

# Check nginx status
sudo systemctl status nginx

# Check logs
sudo -u z pm2 logs passk-chat --lines 50
```

### **SSL Certificate Issues:**
```bash
# Check certificate status
sudo certbot certificates

# Manually renew if needed
sudo certbot renew --dry-run

# Test nginx config
sudo nginx -t
```

### **Permission Issues:**
```bash
# Fix ownership
sudo chown -R z:z /home/z/passk

# Fix permissions
sudo chmod -R 755 /home/z/passk
```

## 📞 Support

For issues with deployment, check:
1. Application logs: `passk-logs`
2. Nginx logs: `sudo journalctl -u nginx -f`
3. PM2 logs: `sudo -u z pm2 logs passk-chat`
4. System logs: `sudo journalctl -f`

---

**Note**: Update the `REPO_URL` in the deployment script with your actual GitHub repository URL before running.