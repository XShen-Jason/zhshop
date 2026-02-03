# ZhShop 智汇商城

> 一站式数字产品交易平台，集商城、拼团、抽奖、积分系统于一体。

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

---

## ✨ 功能特性

| 模块 | 功能 |
|------|------|
| **🛒 商城** | 商品分类/二级分类、热门标记、库存管理、订单追踪 |
| **👥 拼团** | 自动进度计算、锁单管理、自动续期、参与统计 |
| **🎁 抽奖** | 积分抽奖、自动延期、中奖通知、历史记录 |
| **💰 积分** | 每日签到、邀请奖励、消费返积分、流水查询 |
| **👤 用户** | 邀请码分享、用户名修改、联系方式管理 |
| **🔧 后台** | 交易统计、订单/商品/拼团/抽奖管理、网站配置 |

---

## 🚀 本地开发

```bash
git clone https://github.com/XShen-Jason/zhshop.git
cd zhshop/frontend
npm install
cp .env.example .env.local  # 填入 Supabase 配置
npm run dev
```

**环境变量 (.env.local)**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

---

## �️ 技术栈

| 分类 | 技术 |
|------|------|
| **前端** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **后端** | Next.js API Routes, Supabase |
| **数据库** | PostgreSQL (Supabase) |
| **部署** | PM2 + Nginx |

---

# 📦 服务器部署指南 (Ubuntu 24)

## 第一步：系统初始化

```bash
# 设置时区
sudo timedatectl set-timezone Asia/Shanghai

# 配置 2G Swap (防止构建时内存不足)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 更新系统
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx unzip
```

## 第二步：安装环境

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# 创建目录
sudo mkdir -p /var/www/zhshop
sudo chown $USER:$USER /var/www/zhshop

# 克隆代码
cd /var/www/zhshop && git clone https://github.com/XShen-Jason/zhshop.git .
```

## 第三步：配置环境变量

```bash
cat > /var/www/zhshop/frontend/.env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
EOF
```

## 第四步：构建 & 启动

```bash
cd /var/www/zhshop/frontend
npm install && npm run build

# PM2 启动 (2G内存用1300M，4G用2500M)
pm2 start npm --name "zhshop" --max-memory-restart 1300M -- start

# 开机自启
pm2 startup systemd -u $USER --hp $HOME
pm2 save
```

## 第五步：Nginx 配置

```bash
sudo tee /etc/nginx/sites-available/zhshop > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    client_max_body_size 5M;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/zhshop /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# 防火墙
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw enable
```

---

# 🌐 域名绑定 (Cloudflare + 腾讯云)

## Cloudflare 配置

1. **DNS 记录**：添加 A 记录指向服务器 IP，开启代理 ☁️
2. **SSL 设置**：选择 **Full**

## 服务器配置 HTTPS

```bash
# 创建 Cloudflare Origin 证书目录
sudo mkdir -p /etc/ssl/cloudflare

# 保存证书 (从 Cloudflare SSL/TLS → Origin Server 获取)
sudo nano /etc/ssl/cloudflare/cert.pem
sudo nano /etc/ssl/cloudflare/key.pem
sudo chmod 600 /etc/ssl/cloudflare/key.pem
```

**更新 Nginx (HTTPS)**

```bash
sudo tee /etc/nginx/sites-available/zhshop > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 20M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo nginx -t && sudo systemctl restart nginx
```

---

## 🔄 更新部署

```bash
cd /var/www/zhshop
git pull
cd frontend && npm install && npm run build
pm2 restart zhshop
```

**强制同步远程**
```bash
git fetch origin && git reset --hard origin/main
cd frontend && npm install && npm run build && pm2 restart zhshop
```

---

## 📋 常用命令

| 操作 | 命令 |
|------|------|
| 查看状态 | `pm2 status` |
| 查看日志 | `pm2 logs zhshop` |
| 重启应用 | `pm2 restart zhshop` |
| Nginx 日志 | `sudo tail -f /var/log/nginx/error.log` |

---

## ⏰ 定时任务

**清理未验证用户 (每日凌晨3点)**
```bash
crontab -e
# 添加:
0 3 * * * curl -X POST http://localhost:3000/api/cron/cleanup-unverified >> /var/log/zhshop-cleanup.log 2>&1
```

---

## 📄 License

MIT License
