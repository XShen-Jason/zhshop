
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iwsiwuyvtgmrncsdydmb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c2l3dXl2dGdtcm5jc2R5ZG1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1MjU1MSwiZXhwIjoyMDg0MzI4NTUxfQ.2DVH9UPn0FOVv_EB5OZVbrsFe2kkPVr9F15KPbeQ0CM';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const tutorialContent = `
# 互助有奖：欧易OKX集力赚币合约季（限3人）

**集力赚币合约季，邀请3名好友完成合约网格任务，帮您赚大奖！**

本活动为限时互助活动，只需要3位新用户参与，每一位参与的用户需要做到指定任务，并在固定时间过后，可以领取现金奖励。

## 💰 奖励机制
- **总奖池**：150 USDT
- **助我得**：您注册欧易即领奖励。

## 🔗 参与方式

### 1. 注册链接
请务必使用以下链接注册，确保被精准记录：
👉 [**点击这里注册 (需要新用户)**](https://www.nqfaxzrusob.com/join/68061385)

互助有奖链接：[点击领取奖励](https://oyidl.co/ul/jhEs1u?channelId=68061385)

### 2. 下载应用
注册完成后，请下载欧易 OKX App 进行操作：
- **Android 下载**: [点击查看](https://www.ouchyi.support/zh-hans/help/faq-about-downloading-app-for-android)
- **iOS 下载**: [点击查看](https://www.ouchyi.support/zh-hans/help/how-to-download-okx-app-on-iphone)
- **鸿蒙下载**: [点击查看](https://www.ouchyi.support/zh-hans/help/5-app)

## 📝 任务流程

### 第一步：招集好友
使用上述专属链接注册。**提醒：请使用浏览器打开链接，确保邀请被精准记录。**

### 第二步：助力加速 (关键任务)
参与者需要完成以下任务以获得奖励资格：
- **合约网格投入**: ≥ 100 USDT

### 第三步：获得 150 USDT
锁定不明结束后解锁奖励：
- 这3位好友需各自在合约网格中**保持至少 7 天 100 USDT 的资产余额**。

## ⚠️ 注意事项
1. 必须通过本页面的指定链接注册。
2. 保持资金在合约网格中至少7天，不得提前赎回。
3. 名额有限，仅限前3名合格用户。
`;

async function main() {
    console.log('Publishing tutorial...');
    const { data, error } = await supabase
        .from('tutorials')
        .insert({
            title: '互助有奖：欧易OKX集力赚币合约季（限3人）',
            summary: '邀请3位好友完成合约网格任务，立领150USDT。本活动只需3人，投入100U保持7天即可瓜分奖励。',
            content: tutorialContent,
            category: '活动福利',
            updated_at: new Date().toISOString()
        })
        .select();

    if (error) {
        console.error('Error publishing tutorial:', error);
    } else {
        console.log('✅ Tutorial published successfully!');
        console.log('ID:', data[0].id);
        console.log('Title:', data[0].title);
    }
}

main();
