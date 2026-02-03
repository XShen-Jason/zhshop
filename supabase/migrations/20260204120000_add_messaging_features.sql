-- Add specific user targeting to messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Update type check constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE messages ADD CONSTRAINT messages_type_check 
  CHECK (type IN ('announcement', 'group_notice', 'user_specific'));
