# Pop-Up Play Deployment Guide

## ✅ Deployment Status

Your Pop-Up Play application is **successfully deployed and running** on your Hetzner server!

### Current Setup

**Domain:** popupplay.fun & www.popupplay.fun  
**SSL:** ✅ HTTPS with Let's Encrypt (auto-renews on 2026-05-14)  
**Frontend:** ✅ Running on port 3000  
**Backend API:** ✅ Running on port 3001  
**Database:** ✅ PostgreSQL running on port 5432  

---

## 📊 Container Status

```
pop-up-play-app    Up  0.0.0.0:3000->3000/tcp, 0.0.0.0:3001->3001/tcp
pop-up-play-db     Up (healthy) 0.0.0.0:5432->5432/tcp
```

---

## 🔧 Configuration Files Created

### `.env` - Environment Variables
Located at: `/root/pop-up-play/.env`

**Important:** Update these values before going to production:
- `PAYPAL_CLIENT_ID` - Add your PayPal client ID
- `PAYPAL_CLIENT_SECRET` - Add your PayPal client secret
- `PAYPAL_MODE` - Set to `sandbox` for testing or `live` for production
- `PAYPAL_WEBHOOK_ID` - Add your PayPal webhook ID for signature verification
- `EMAIL_HOST_USER` - Add your email address
- `EMAIL_HOST_PASSWORD` - Add your app password
- `JWT_SECRET` - Change to a strong random secret
- `DB_PASSWORD` - Consider changing the default password

### `Dockerfile` - Container Image
Node.js 20 Alpine-based image that:
- Installs dependencies
- Builds the frontend (Vite)
- Serves frontend on port 3000 with `serve`
- Runs backend API on port 3001

### `docker-compose.yml` - Orchestration
- PostgreSQL 16 database container
- Application container with health checks
- Automatic database initialization
- Volume persistence for database data

### `/etc/nginx/sites-available/popupplay.fun` - Web Server
- Redirects HTTP → HTTPS
- Proxies requests to Node.js app
- SSL certificate configured
- Static file caching

---

## 📝 Essential Commands

### Start/Stop the Application
```bash
cd /root/pop-up-play

# Start containers
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f app
docker-compose logs -f postgres

# Restart
docker-compose restart
```

### View Application Status
```bash
# Check containers
docker-compose ps

# Check Nginx status
sudo systemctl status nginx

# Check SSL certificate
sudo certbot certificates
```

### Rebuild After Code Changes
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database Operations
```bash
# Access database
docker-compose exec postgres psql -U popupapp -d popup_play_db

# Backup database
docker-compose exec postgres pg_dump -U popupapp popup_play_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U popupapp popup_play_db < backup.sql
```

---

## 🌐 Access Points

- **Frontend:** https://popupplay.fun
- **API:** https://popupplay.fun/api
- **Database:** localhost:5432 (internal only)

---

## 🔐 Security Checklist

- [ ] Update `.env` with real PayPal API credentials
- [ ] Update `.env` with real email credentials
- [ ] Change JWT_SECRET to a strong random value
- [ ] Change database password (currently: popup2024)
- [ ] Set up firewall rules to only allow ports 80, 443, 22 (SSH)
- [ ] Enable automatic security updates

### Quick Security Updates

```bash
# Restrict database access (only from Docker)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 📦 SSL Certificate Auto-Renewal

Certbot is configured to automatically renew your SSL certificate. To verify:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run  # Test renewal
```

Certificate expires: **2026-05-14**

---

## ⚠️ Common Issues & Solutions

### Application won't start
```bash
docker-compose logs app
```

### Database connection error
```bash
docker-compose logs postgres
# Wait 30-60 seconds for database to be healthy
```

### SSL/HTTPS not working
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### Need to update environment variables
1. Edit `/root/pop-up-play/.env`
2. Restart containers: `docker-compose restart`

---

## 📋 Next Steps

1. **Update sensitive credentials in `.env`:**
   - PayPal API credentials
   - Email credentials
   - JWT secret
   - Database password

2. **Initialize database (if needed):**
   ```bash
   docker-compose exec postgres psql -U popupapp -d popup_play_db < database/schema.sql
   ```

3. **Test the application:**
   - Visit https://popupplay.fun
   - Check browser console for API errors
   - Test login/signup functionality

4. **Monitor logs in production:**
   ```bash
   docker-compose logs -f app
   ```

5. **Set up automatic backups:**
   - Schedule daily database backups
   - Consider S3 or cloud storage

---

## 📞 Support

For issues, check:
- Container logs: `docker-compose logs`
- Nginx logs: `/var/log/nginx/error.log`
- Application logs: Check Docker output

---

**Deployment completed on:** February 13, 2026  
**Deployed by:** GitHub Copilot  
**Server:** Hetzner  
**Uptime:** ✅ Active
