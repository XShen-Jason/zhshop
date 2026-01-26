-- 抽奖功能修复 - 请在 Supabase SQL Editor 中执行此脚本
-- Lottery feature fix - Run this script in Supabase SQL Editor

-- 1. 添加最低参与人数字段
ALTER TABLE lotteries ADD COLUMN IF NOT EXISTS min_participants INTEGER DEFAULT 1;

-- 2. 确保 lottery_entries 表允许管理员更新
-- 首先检查并删除可能阻止更新的策略
DROP POLICY IF EXISTS "Admin can update lottery entries" ON lottery_entries;
DROP POLICY IF EXISTS "Service role full access on lottery entries" ON lottery_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON lottery_entries;

-- 3. 创建允许管理员更新的策略
CREATE POLICY "Admin can update lottery entries" ON lottery_entries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'ADMIN'
  )
);

-- 4. 允许所有已认证用户读取
DROP POLICY IF EXISTS "Anyone can read lottery entries" ON lottery_entries;
CREATE POLICY "Anyone can read lottery entries" ON lottery_entries
FOR SELECT
USING (true);

-- 5. 允许用户创建自己的参与记录
DROP POLICY IF EXISTS "Users can insert own entries" ON lottery_entries;
CREATE POLICY "Users can insert own entries" ON lottery_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 6. 验证表结构
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'lottery_entries';

SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'lotteries';
