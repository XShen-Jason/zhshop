
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iwsiwuyvtgmrncsdydmb.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c2l3dXl2dGdtcm5jc2R5ZG1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1MjU1MSwiZXhwIjoyMDg0MzI4NTUxfQ.2DVH9UPn0FOVv_EB5OZVbrsFe2kkPVr9F15KPbeQ0CM';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const htmlContent = `
<div class="w-full bg-black text-white font-sans rounded-xl overflow-hidden">
    <!-- Header -->
    <div class="relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-900/80 to-black z-0"></div>
        <div class="relative z-10 p-6 flex flex-col items-center pt-10">
            <div class="bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-orange-500/30 px-4 py-1.5 rounded-full text-xs font-bold mb-6 animate-pulse">
                🔥 限前 5 名用户
            </div>
            
            <h1 class="text-3xl font-bold text-center mb-2">新手双重福利</h1>
            <p class="text-gray-300 text-center text-sm mb-8 opacity-90">完成简单任务，领平台奖励 + 现金补贴</p>
            
            <!-- Big Rewards -->
            <div class="flex gap-3 w-full mb-8">
                 <!-- Left: 100 U -->
                <div class="flex-1 relative overflow-hidden bg-gray-900/60 border border-yellow-500/30 p-4 rounded-2xl flex flex-col items-center group">
                    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>
                    <div class="text-xs text-yellow-500/80 mb-1 font-bold tracking-wider">平台奖励</div>
                    <div class="flex items-baseline gap-0.5">
                        <span class="text-3xl font-black text-white">100</span>
                        <span class="text-sm font-bold text-yellow-500">U</span>
                    </div>
                    <div class="text-[10px] text-gray-500 mt-1 scale-90">(等值BTC)</div>
                </div>

                <!-- Right: 88 RMB -->
                <div class="flex-1 relative overflow-hidden bg-gray-900/60 border border-green-500/30 p-4 rounded-2xl flex flex-col items-center">
                    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
                    <div class="text-xs text-green-500/80 mb-1 font-bold tracking-wider">额外补贴</div>
                    <div class="flex items-baseline gap-0.5">
                         <span class="text-sm font-bold text-green-500 mr-0.5">￥</span>
                        <span class="text-3xl font-black text-white">88</span>
                    </div>
                    <div class="text-[10px] text-gray-500 mt-1 scale-90">微信红包</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Conditions -->
    <div class="px-5 space-y-6 pb-20">
        <div class="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 backdrop-blur-sm">
            <h3 class="font-bold text-lg mb-5 flex items-center gap-2 text-white">
                <span class="flex items-center justify-center w-6 h-6 rounded bg-purple-600 text-[10px]">01</span> 
                参与流程 (必做)
            </h3>
            
            <div class="space-y-8 relative pl-2">
                <!-- Line -->
                <div class="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gray-800 z-0"></div>

                <!-- Step 1 -->
                <div class="relative z-10 flex gap-4">
                    <div class="w-8 h-8 rounded-full bg-purple-600 border-4 border-gray-900 text-white flex items-center justify-center font-bold flex-shrink-0 text-sm shadow-lg shadow-purple-900/50">1</div>
                    <div>
                        <h4 class="font-bold text-white text-base">注册账户</h4>
                        <p class="text-xs text-red-400 font-bold mb-2">⚠️ 必须通过下方链接注册 (老用户无效)</p>
                        <a href="https://www.nqfaonrusoa.com/join/68061385" target="_blank" class="inline-flex items-center gap-1 text-purple-400 bg-purple-400/10 px-3 py-1.5 rounded-lg text-sm font-bold border border-purple-400/20 hover:bg-purple-400/20 transition-colors">
                            👉 点击注册 (独家链接)
                        </a>
                    </div>
                </div>

                <!-- Step 2 -->
                <div class="relative z-10 flex gap-4">
                    <div class="w-8 h-8 rounded-full bg-gray-700 border-4 border-gray-900 text-white flex items-center justify-center font-bold flex-shrink-0 text-sm">2</div>
                    <div>
                        <h4 class="font-bold text-gray-200 mb-2">下载 OKX App</h4>
                        <div class="flex flex-wrap gap-2">
                            <a href="https://www.ouchyi.support/zh-hans/help/faq-about-downloading-app-for-android" target="_blank" class="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 hover:text-white">安卓</a>
                            <a href="https://www.ouchyi.support/zh-hans/help/how-to-download-okx-app-on-iphone" target="_blank" class="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 hover:text-white">iOS</a>
                            <a href="https://www.ouchyi.support/zh-hans/help/5-app" target="_blank" class="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 hover:text-white">鸿蒙</a>
                        </div>
                    </div>
                </div>

                <!-- Step 3 -->
                <div class="relative z-10 flex gap-4">
                    <div class="w-8 h-8 rounded-full bg-gray-700 border-4 border-gray-900 text-white flex items-center justify-center font-bold flex-shrink-0 text-sm">3</div>
                    <div>
                        <h4 class="font-bold text-gray-200 mb-1">身份认证 (KYC)</h4>
                        <p class="text-xs text-gray-400">在 App 内完成实名认证，否则无法领奖。</p>
                    </div>
                </div>

                <!-- Step 4 -->
                <div class="relative z-10 flex gap-4">
                    <div class="w-8 h-8 rounded-full bg-gray-700 border-4 border-gray-900 text-white flex items-center justify-center font-bold flex-shrink-0 text-sm">4</div>
                    <div class="w-full">
                        <h4 class="font-bold text-gray-200 mb-1">首充 ≥ 100 USDT</h4>
                        <div class="bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-lg mb-1">
                            <p class="text-xs text-yellow-500 font-bold flex items-start gap-1">
                                <span>�</span>
                                强烈推荐充值 101 U 以上！
                            </p>
                            <p class="text-[10px] text-yellow-500/70 mt-0.5 ml-4">
                                防止扣除手续费后到账不足 100 U 导致任务失败。
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Step 5 -->
                <div class="relative z-10 flex gap-4">
                    <div class="w-8 h-8 rounded-full bg-gray-700 border-4 border-gray-900 text-white flex items-center justify-center font-bold flex-shrink-0 text-sm">5</div>
                    <div class="w-full">
                        <h4 class="font-bold text-gray-200 mb-1">完成 1 笔现货交易</h4>
                        <div class="bg-yellow-500/10 border border-yellow-500/20 p-2.5 rounded-lg mb-2">
                             <p class="text-xs text-yellow-500 font-bold flex items-start gap-1">
                                <span>🔥</span>
                                单笔交易额需 ≥ 100 U (推荐 101 U)
                            </p>
                        </div>
                        <div class="bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                            <p class="text-[10px] text-red-300/80 mb-1">⛔ 以下交易无效：</p>
                            <p class="text-[10px] text-red-300">合约、杠杆、稳定币互换 (USDT/USDC)</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 backdrop-blur-sm">
             <h3 class="font-bold text-lg mb-4 flex items-center gap-2 text-white">
                <span class="flex items-center justify-center w-6 h-6 rounded bg-green-600 text-[10px]">02</span> 
                领取 ￥88 现金
            </h3>
            <p class="text-sm text-gray-300 mb-3">完成上方所有任务后，请截图联系管理员：</p>
            <div class="grid grid-cols-3 gap-2 text-[10px] text-gray-400 text-center">
                <div class="bg-black/40 p-2 rounded border border-gray-800">注册成功页</div>
                <div class="bg-black/40 p-2 rounded border border-gray-800">充值记录</div>
                <div class="bg-black/40 p-2 rounded border border-gray-800">交易记录</div>
            </div>
        </div>
        
        <div class="text-[10px] text-gray-600 text-center pb-4">
            * 最终解释权归本平台所有
        </div>
    </div>

    <!-- Footer Action -->
    <div class="w-full p-4 border-t border-gray-800 mt-4 bg-black">
        <a href="https://www.nqfaonrusoa.com/join/68061385" target="_blank" class="block w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-center rounded-full hover:from-purple-500 hover:to-blue-500 transition shadow-lg shadow-purple-900/40 text-lg">
            立即注册领奖
        </a>
    </div>
</div>
`;

async function main() {
    console.log('Publishing Refined New User activity...');
    const { data, error } = await supabase
        .from('tutorials')
        .insert({
            title: '新用户福利：最高100U奖励+88元补贴（Refined）',
            summary: '新手必看！完成注册、KYC、首充及现货交易任务，领取丰厚双重奖励。',
            content: htmlContent,
            category: '活动福利',
            updated_at: new Date().toISOString(),
            tags: ['html-mode', '新手', '福利']
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
