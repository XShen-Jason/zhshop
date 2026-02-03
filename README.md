# ZhShop 智汇商城

> 一站式数字产品交易平台，集商城、拼团、抽奖、积分系统于一体。

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## ✨ 功能特性

### 🛒 商城系统
- 商品分类与二级分类
- 热门商品标记
- 库存管理
- 订单追踪

### 👥 拼团系统
- 自动计算进度
- 锁单/结束状态管理
- 自动续期功能
- 参与量统计

### 🎁 抽奖系统
- 积分抽奖
- 自动延期（人数不足）
- 中奖通知
- 历史记录

### 💰 积分系统
- 每日签到（连续签到奖励递增）
- 邀请好友奖励
- 消费返积分
- 积分流水查询

### 👤 用户中心
- 邀请码分享
- 用户名修改
- 联系方式管理
- 订单/拼团/抽奖记录

### 🔧 管理后台
- 交易统计（今日/昨日/本月）
- 订单管理
- 商品/拼团/抽奖管理
- 网站配置

---

## 🚀 快速开始

### 本地开发

```bash
# 克隆项目
git clone https://github.com/XShen-Jason/zhshop.git
cd zhshop/frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase 配置

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

---

## 📦 部署

详细部署指南请查看：

- [**DEPLOYMENT.md**](./DEPLOYMENT.md) - Ubuntu 服务器一键部署
- [**DOMAIN_SETUP.md**](./DOMAIN_SETUP.md) - 域名绑定 (Cloudflare + 腾讯云)

### 快速部署流程

1. **服务器准备** (Ubuntu 24+)
2. **安装 Node.js 20 + PM2**
3. **克隆代码 + 配置环境变量**
4. **`npm install && npm run build`**
5. **PM2 启动 + Nginx 反向代理**
6. **配置 HTTPS（可选）**

---

## 🛠️ 技术栈

| 分类 | 技术 |
|------|------|
| **前端** | Next.js 15, React 19, TypeScript |
| **样式** | Tailwind CSS |
| **后端** | Next.js API Routes |
| **数据库** | Supabase (PostgreSQL) |
| **认证** | Supabase Auth |
| **存储** | Supabase Storage |
| **进程管理** | PM2 |
| **反向代理** | Nginx |

---

## 📁 项目结构

```
zhshop/
├── frontend/
│   ├── src/
│   │   ├── app/              # 页面和API路由
│   │   │   ├── admin/        # 管理后台
│   │   │   ├── api/          # API端点
│   │   │   ├── auth/         # 认证页面
│   │   │   ├── products/     # 商品页面
│   │   │   ├── groups/       # 拼团页面
│   │   │   ├── lottery/      # 抽奖页面
│   │   │   └── user/         # 用户中心
│   │   ├── components/       # 公共组件
│   │   ├── lib/              # 工具函数
│   │   └── types/            # TypeScript类型
│   └── public/               # 静态资源
├── DEPLOYMENT.md             # 部署指南
└── DOMAIN_SETUP.md           # 域名配置
```

---

## 📄 License

MIT License
