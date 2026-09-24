-- New rank between Technical Director and province / viewer.
-- Enum value must be committed before later migrations can use it.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technical_assistant';
