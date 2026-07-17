-- Add ai_title_template column to profiles for dealer listing title style
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_title_template TEXT DEFAULT '';
