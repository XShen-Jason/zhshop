import { GroupBuy, GroupStatus, Lottery, LotteryStatus, Product, Tutorial, User, UserRole } from '@/types';

export const MOCK_USER: User = {
    id: 'u1',
    name: '演示用户',
    email: 'user@example.com',
    role: UserRole.USER,
    points: 1250,
    contactInfo: '@telegram_handle',
    lastCheckIn: ''
};

export const MOCK_ADMIN: User = {
    id: 'a1',
    name: '管理员',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    points: 99999
};

export const PRODUCTS: Product[] = [
    {
        id: 'p1',
        title: '高性能 VPS - 香港 CN2 GIA',
        description: '高速低延迟，不仅适合建站，也适合作为个人的开发测试环境。',
        price: 15.00,
        category: 'VPS服务器',
        inStock: true,
        features: ['1 Core CPU', '2GB RAM', 'CN2 GIA 线路直连'],
        specs: 'Ubuntu 22.04 LTS',
        tutorialId: 't1'
    },
    {
        id: 'p4',
        title: '入门级 VPS - 美国洛杉矶',
        description: '性价比之选，适合新手入门学习 Linux。',
        price: 5.00,
        category: 'VPS服务器',
        inStock: true,
        features: ['1 Core CPU', '1GB RAM', '1Gbps 带宽'],
        specs: 'Debian 11'
    },
    {
        id: 'p2',
        title: 'ChatGPT Plus 共享账号',
        description: '稳定可靠的 GPT-4 共享访问权限，支持最新的插件功能。',
        price: 5.00,
        category: '账号合租',
        inStock: true,
        features: ['共享访问', '包含 GPT-4', '禁止 API 调用'],
        specs: '有效期 30 天',
        tutorialId: 't2'
    },
    {
        id: 'p5',
        title: 'Midjourney Pro 共享车位',
        description: '无限出图，隐私模式，设计师首选。',
        price: 10.00,
        category: '账号合租',
        inStock: true,
        features: ['Fast Mode', '隐私保护', '独立频道'],
        specs: '有效期 30 天'
    },
    {
        id: 'p3',
        title: '流媒体全家桶 (Netflix + Spotify)',
        description: '4K 超高清画质，家庭组独立车位，稳定不掉线。',
        price: 8.50,
        category: '娱乐影音',
        inStock: false,
        features: ['4K UHD 画质', '独立个人档案'],
        specs: '可续费'
    },
    {
        id: 'p6',
        title: 'YouTube Premium 家庭组',
        description: '无广告观看，后台播放，YouTube Music。',
        price: 2.50,
        category: '娱乐影音',
        inStock: true,
        features: ['无广告', 'Music Premium'],
        specs: '长期稳定'
    }
];

export const TUTORIALS: Tutorial[] = [
    {
        id: 't1',
        title: '如何安全地配置您的 Linux VPS',
        summary: '从零开始配置服务器安全，包括 SSH 密钥登录和防火墙设置保姆级教程。',
        content: `
      <h2>简介</h2>
      <p>服务器安全是重中之重。本指南将带您完成基础的加固步骤。</p>
      <h3>第一步：更新系统</h3>
      <pre class="bg-gray-800 text-white p-2 rounded">apt update && apt upgrade -y</pre>
      <h3>第二步：创建新用户</h3>
      <p>切勿直接使用 root 用户运行服务...</p>
    `,
        updatedAt: '2023-10-25',
        category: '技术指南',
        tags: ['VPS', 'Linux', '网络安全'],
        relatedProductId: 'p1'
    },
    {
        id: 't2',
        title: '掌握 GPT-4 提示词工程 (Prompt Engineering)',
        summary: '学习如何编写高效的提示词，让 AI 输出最符合您预期的结果。',
        content: '<p>提示词工程是一门艺术，也是与 AI 对话的关键...</p>',
        updatedAt: '2023-11-10',
        category: '人工智能',
        tags: ['AI', 'ChatGPT', '教程'],
        relatedProductId: 'p2'
    }
];

export const GROUP_BUYS: GroupBuy[] = [
    {
        id: 'g1',
        title: 'Office 365 家庭版拼车',
        targetCount: 6,
        currentCount: 4,
        status: GroupStatus.ACTIVE,
        price: 45,
        description: 'Office 365 家庭版年度订阅拼车。正规渠道订阅，每人拥有独立账号和 1TB OneDrive 空间。',
        features: ['1TB OneDrive', '全套 Office 软件', '独立账号隐私保护']
    },
    {
        id: 'g2',
        title: 'Nintendo Switch Online 高级会员',
        targetCount: 8,
        currentCount: 8,
        status: GroupStatus.LOCKED,
        price: 35,
        description: '包含扩充包（动森DLC、赛车DLC等）。人数已满，正在处理支付。',
        features: ['联机对战', '云存档', '扩充包内容']
    },
    {
        id: 'g3',
        title: '1Password 家庭组拼车',
        targetCount: 5,
        currentCount: 1,
        status: GroupStatus.ACTIVE,
        price: 20,
        description: '最好的密码管理软件。家庭组车位，独立保险库。',
        features: ['跨平台同步', '独立保险库', '安全共享']
    }
];

export const LOTTERIES: Lottery[] = [
    {
        id: 'l1',
        title: '每周 VPS 免费送',
        drawDate: '2024-12-31T20:00:00',
        winnersCount: 3,
        entryCost: 100,
        status: LotteryStatus.PENDING,
        participants: 142,
        description: '本周福利！抽出 3 位幸运用户赠送香港 CN2 GIA VPS 一个月使用权。',
        prizes: ['香港 CN2 GIA VPS (1个月) x 3']
    },
    {
        id: 'l2',
        title: '$50 Steam 充值卡',
        drawDate: '2023-10-01T20:00:00',
        winnersCount: 1,
        entryCost: 500,
        status: LotteryStatus.COMPLETED,
        participants: 50,
        description: 'Steam 钱包充值卡，全球通用。',
        prizes: ['$50 Steam Gift Card x 1']
    },
    {
        id: 'l3',
        title: 'Netflix 独享账号 (年付)',
        drawDate: '2024-05-20T12:00:00',
        winnersCount: 1,
        entryCost: 200,
        status: LotteryStatus.PENDING,
        participants: 88,
        description: '从此告别剧荒！抽取一名欧皇赠送 Netflix 4K 高级会员独享账号一年。',
        prizes: ['Netflix Premium 1 Year x 1']
    }
];
