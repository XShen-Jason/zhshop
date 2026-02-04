
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iwsiwuyvtgmrncsdydmb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c2l3dXl2dGdtcm5jc2R5ZG1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1MjU1MSwiZXhwIjoyMDg0MzI4NTUxfQ.2DVH9UPn0FOVv_EB5OZVbrsFe2kkPVr9F15KPbeQ0CM';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const htmlContent = `
<div class="w-full bg-black text-white font-sans rounded-xl overflow-hidden">
    <!-- Header -->
    <div class="relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-green-900/50 to-black z-0"></div>
        <div class="relative z-10 p-6 flex flex-col items-center pt-12">
            <div class="text-gray-400 text-xs mb-2">历史记录</div>
            <h1 class="text-3xl font-bold text-center mb-2">集力赚币合约季</h1>
            <p class="text-gray-300 text-center text-sm mb-6">邀请3名好友完成合约网格任务，<br/>帮您赚大奖。</p>
            
            <!-- Countdown -->
            <div class="flex gap-2 mb-8">
                <div class="bg-lime-400 text-black font-bold px-2 py-1 rounded text-xs">71时</div>
                <div class="bg-lime-400 text-black font-bold px-2 py-1 rounded text-xs">45分</div>
                <div class="bg-lime-400 text-black font-bold px-2 py-1 rounded text-xs">15秒</div>
            </div>

            <div class="text-[80px] font-bold leading-none tracking-tighter mb-2">150</div>
            <div class="text-4xl font-bold mb-10">USDT.</div>

            <!-- Avatars -->
            <div class="flex justify-center gap-8 mb-10 w-full">
                <div class="flex flex-col items-center gap-2">
                    <div class="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-2xl">+</div>
                    <span class="text-xs text-gray-400">招集好友</span>
                </div>
                <div class="flex flex-col items-center gap-2">
                    <div class="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-2xl">+</div>
                    <span class="text-xs text-gray-400">助力加速</span>
                </div>
                <div class="flex flex-col items-center gap-2">
                    <div class="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-2xl">+</div>
                    <span class="text-xs text-gray-400">领取奖励</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Steps -->
    <div class="px-6 pb-8 space-y-8">
        <div class="flex gap-4">
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-lime-400 text-black flex items-center justify-center font-bold">1</div>
            <div>
                <h3 class="font-bold mb-2">招集好友</h3>
                <p class="text-sm text-gray-400 leading-relaxed mb-3">
                    使用集力赚币专属链接邀请好友，提醒好友使用浏览器打开链接，确保邀请被精准记录。
                </p>
                <a href="https://www.nqfaxzrusob.com/join/68061385" target="_blank" class="text-lime-400 text-sm font-bold underline">点击注册 (推荐链接)</a>
            </div>
        </div>

        <div class="flex gap-4">
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-lime-400 text-black flex items-center justify-center font-bold">2</div>
            <div>
                <h3 class="font-bold mb-2">助力加速</h3>
                <p class="text-sm text-gray-400 leading-relaxed mb-3">
                    当3位好友下载并完成任务后，您即可获得奖励资格：
                </p>
                <ul class="list-disc list-inside text-sm text-gray-400 pl-2 space-y-1">
                    <li>合约网格投入 ≥ 100 USDT</li>
                </ul>
                <div class="mt-3 flex flex-wrap gap-2">
                    <a href="https://www.ouchyi.support/zh-hans/help/faq-about-downloading-app-for-android" target="_blank" class="px-3 py-1 bg-gray-800 rounded text-xs text-white">安卓下载</a>
                    <a href="https://www.ouchyi.support/zh-hans/help/how-to-download-okx-app-on-iphone" target="_blank" class="px-3 py-1 bg-gray-800 rounded text-xs text-white">iOS下载</a>
                </div>
            </div>
        </div>

        <div class="flex gap-4">
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-lime-400 text-black flex items-center justify-center font-bold">3</div>
            <div>
                <h3 class="font-bold mb-2">获得 150 USDT</h3>
                <p class="text-sm text-gray-400 leading-relaxed">
                    锁定不明结束后解锁奖励：这3位好友需各自在合约网格中保持至少 7 天 100 USDT 的资产余额。
                </p>
            </div>
        </div>
    </div>

    <!-- Bottom Action -->
    <div class="w-full p-4 bg-black border-t border-gray-800 mt-8">
        <div class="max-w-md mx-auto">
            <a href="https://oyidl.co/ul/jhEs1u?channelId=68061385" target="_blank" class="block w-full py-3 bg-lime-400 text-black font-bold text-center rounded-full hover:bg-lime-300 transition">
                立邀赚取 150 USDT
            </a>
        </div>
    </div>
</div>
`;

async function main() {
    console.log('Publishing H5 tutorial...');
    const { data, error } = await supabase
        .from('tutorials')
        .insert({
            title: '互助有奖：欧易OKX集力赚币（修复版2.0）',
            summary: 'H5沉浸式活动页。邀请3位好友完成合约网格任务，立领150USDT。',
            content: htmlContent,
            category: '活动福利',
            updated_at: new Date().toISOString(),
            tags: ['html-mode']
        })
        .select();

    if (error) {
        console.error('Error publishing tutorial:', error);
    } else {
        console.log('✅ H5 Tutorial published successfully!');
        console.log('ID:', data[0].id);
        console.log('Title:', data[0].title);
    }
}

main();
