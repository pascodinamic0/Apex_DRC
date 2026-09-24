-- Part 1: new app_duty enum value must commit before use (Postgres 55P04).
-- Run the next migration (20260924180001) immediately after this one.

ALTER TYPE public.app_duty ADD VALUE IF NOT EXISTS 'manage_provincial_users';
