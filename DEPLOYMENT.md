# 📋 DEPLOYMENT & PRODUCTION CHECKLIST

## ✅ Pre-Deployment Checklist

### Code Quality

- [ ] Semua fitur sudah tested
- [ ] Tidak ada console.error yang tertinggal
- [ ] Tidak ada hardcoded credentials
- [ ] Error handling untuk semua routes
- [ ] Input validation di semua form

### Security

- [ ] Ubah SESSION_SECRET di .env
- [ ] Ubah default admin password
- [ ] HTTPS enabled (jika production)
- [ ] Rate limiting for login (recommended)
- [ ] Remove debug logs

### Database

- [ ] Database sudah di-backup
- [ ] Schema migration tested
- [ ] All indexes created
- [ ] Connection pool limits set
- [ ] Database user dengan minimal privileges

### Performance

- [ ] Assets minified (CSS, JS)
- [ ] Images optimized
- [ ] Pagination implemented
- [ ] Database queries optimized
- [ ] Caching strategy planned

### Documentation

- [ ] README.md complete
- [ ] Setup instructions clear
- [ ] API documentation updated
- [ ] Code comments added
- [ ] Deployment guide ready

---

## 🚀 Deployment Options

### Option 1: Self-Hosted (VPS/Dedicated Server)

```bash
# 1. Server Setup
ssh user@your-server
apt update && apt upgrade -y
apt install nodejs npm mysql-server -y

# 2. Clone repository
git clone <your-repo>
cd e-invoice

# 3. Setup environment
cp .env.example .env
# Edit .env with production values

# 4. Install dependencies
npm install --production

# 5. Database setup
mysql -u root -p < db/schema.sql

# 6. Start with process manager
npm install -g pm2
pm2 start app.js --name "e-invoice"
pm2 save
pm2 startup

# 7. Setup Nginx reverse proxy
# Configure Nginx to forward to http://localhost:3000
```

### Option 2: Heroku

```bash
# 1. Setup Heroku CLI
heroku login

# 2. Create app
heroku create your-app-name

# 3. Setup database (ClearDB MySQL)
heroku addons:create cleardb:ignite

# 4. Set environment variables
heroku config:set SESSION_SECRET=your-secret
heroku config:set DB_HOST=... DB_USER=... etc

# 5. Deploy
git push heroku main

# 6. Run migrations
heroku run "mysql < db/schema.sql"
```

### Option 3: Docker

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

---

## 🔒 Security Hardening

### 1. Environment Variables

```env
# .env (production)
NODE_ENV=production
PORT=3000

# Database (use dedicated user)
DB_HOST=localhost
DB_USER=e_invoice_user  # NOT root!
DB_PASS=strong-password-min-20-chars
DB_NAME=e_invoice

# Session
SESSION_SECRET=generate-strong-random-string-32-chars-min

# Optional
APP_NAME=E-Invoice
LOG_LEVEL=error
```

### 2. Database Security

```sql
-- Create dedicated user for app
CREATE USER 'e_invoice_user'@'localhost' IDENTIFIED BY 'strong-password';

-- Grant specific privileges only
GRANT SELECT, INSERT, UPDATE, DELETE ON e_invoice.* TO 'e_invoice_user'@'localhost';
FLUSH PRIVILEGES;

-- Disable remote access
-- Bind MySQL to localhost only in my.cnf:
# bind-address = 127.0.0.1
```

### 3. Application Security

- Use HTTPS (SSL/TLS certificate)
- Implement rate limiting on login
- Add CSRF tokens (future enhancement)
- Implement 2FA for admin accounts
- Log all admin actions
- Regular security updates

### 4. Server Security

- Keep OS updated
- Use firewall
- Disable unnecessary services
- Enable SSH key authentication
- Regular backups
- Monitor disk space & performance

---

## 📦 Backup & Recovery

### Daily Backup Strategy

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/e-invoice"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -u e_invoice_user -p"${DB_PASS}" e_invoice > \
  $BACKUP_DIR/invoice_db_${DATE}.sql

# Backup application files
tar -czf $BACKUP_DIR/app_${DATE}.tar.gz \
  /path/to/e-invoice --exclude=node_modules --exclude=.git

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR"
```

### Restore from Backup

```bash
# Restore database
mysql -u e_invoice_user -p e_invoice < backup_file.sql

# Restore application
tar -xzf app_backup.tar.gz -C /path/to/destination
```

---

## 📊 Monitoring & Logging

### Application Logging

```javascript
// Add logging middleware
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
	next()
})

// Error logging
app.use((err, req, res, next) => {
	console.error(err.stack)
	// Log to file or external service
})
```

### Key Metrics to Monitor

- [ ] Response time (target: < 200ms)
- [ ] Database query time
- [ ] Error rate
- [ ] Active sessions
- [ ] Server CPU/Memory usage
- [ ] Disk space
- [ ] Database size

### Tools

- PM2 (monitoring & logs)
- Nginx logs
- MySQL slow query log
- CloudWatch (if on AWS)

---

## 🔄 Deployment Pipeline

### Version Control

```bash
# Feature branch workflow
git checkout -b feature/new-feature
# Make changes
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Create PR for review
# After approval, merge to main
# Auto-deploy to production
```

### CI/CD (GitHub Actions Example)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "16"
      - run: npm install
      - run: npm test
      - name: Deploy to server
        run: |
          ssh user@server "cd e-invoice && git pull && npm install --production && pm2 restart app"
```

---

## 📈 Performance Optimization

### Before Production

```javascript
// 1. Compression middleware
const compression = require("compression")
app.use(compression())

// 2. Database connection pooling (already done)
const pool = mysql.createPool({ connectionLimit: 10 })

// 3. Static asset caching
app.use(
	express.static("public", {
		maxAge: "1d",
	}),
)

// 4. Query optimization
// Add indexes on frequently searched columns
// Use EXPLAIN to analyze queries
```

### Production Checklist

- [ ] Enable gzip compression
- [ ] Cache static assets
- [ ] Optimize database queries
- [ ] Set appropriate connection pool limits
- [ ] Monitor slow queries
- [ ] Use CDN for assets (optional)

---

## 🆘 Troubleshooting Production Issues

### Issue: Aplikasi crashed setelah deploy

```bash
# Check logs
pm2 logs e-invoice

# Restart manually
pm2 restart e-invoice

# Check node version mismatch
node --version
npm --version

# Clear cache
npm cache clean --force
rm -rf node_modules
npm install --production
```

### Issue: Database connection timeout

```bash
# Check MySQL status
systemctl status mysql

# Check connection pool settings
# Increase in config if needed

# Monitor active connections
SHOW PROCESSLIST;
```

### Issue: High memory usage

```bash
# Check which process using memory
top -b -o +%MEM | head -20

# Check Node.js memory
node --max-old-space-size=2048 app.js

# Check for memory leaks
# Monitor over time with PM2
```

### Issue: Slow page load

```bash
# Check database slow query log
tail -f /var/log/mysql/slow.log

# Analyze query
EXPLAIN SELECT ...

# Add index if needed
ALTER TABLE invoices ADD INDEX idx_status (status)
```

---

## 📞 Post-Deployment

### First 24 Hours

- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Verify all features work
- [ ] Test on multiple devices/browsers
- [ ] Monitor server resources

### Weekly

- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Backup database
- [ ] Security updates check
- [ ] User feedback review

### Monthly

- [ ] Full security audit
- [ ] Database optimization
- [ ] Performance tuning
- [ ] Capacity planning
- [ ] Update dependencies

---

## 📝 Runbook (Quick Reference)

### Emergency Restart

```bash
# 1. SSH to server
ssh user@server

# 2. Check status
pm2 status

# 3. Restart app
pm2 restart e-invoice

# 4. Verify running
pm2 logs e-invoice
```

### Database Backup (Emergency)

```bash
mysqldump -u e_invoice_user -p e_invoice > backup_$(date +%s).sql
```

### Rollback Deployment

```bash
# 1. Check git log
git log --oneline -n 10

# 2. Revert to previous version
git revert <commit-hash>
git push

# 3. Auto-redeploy via CI/CD
# Or manual: npm install && pm2 restart e-invoice
```

### Check Disk Space

```bash
df -h
du -sh /var/lib/mysql  # Check database size
du -sh /path/to/app    # Check app size
```

---

## 🎓 Team Documentation

Create these for your team:

- [ ] Admin manual
- [ ] Database schema documentation
- [ ] API documentation
- [ ] Deployment guide
- [ ] Troubleshooting guide
- [ ] Emergency procedures

---

## ✅ Final Deployment Checklist

```
SECURITY:
[ ] SSL certificate installed
[ ] .env configured for production
[ ] Admin password changed
[ ] Database user created with limited privileges
[ ] Firewall rules configured

DATABASE:
[ ] Database backup exists
[ ] Schema migrations completed
[ ] Indexes created
[ ] Connection pool tuned

APPLICATION:
[ ] NODE_ENV=production set
[ ] Error handling complete
[ ] Logging configured
[ ] Assets optimized
[ ] Dependencies updated

MONITORING:
[ ] Error monitoring setup
[ ] Performance monitoring setup
[ ] Uptime monitoring setup
[ ] Backup schedule configured
[ ] Alert notifications setup

DOCUMENTATION:
[ ] README updated
[ ] API docs updated
[ ] Runbook created
[ ] Team trained
[ ] Emergency contact list updated
```

---

**Ready for production! 🚀**

Version: 1.0.0
Last Updated: December 25, 2025
