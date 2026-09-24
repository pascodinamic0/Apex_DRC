-- First-login onboarding: phone, address, and a completion flag.
-- Existing accounts are treated as already onboarded.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT true;

-- Only the service role may flip completion. Invited users finish it through the onboarding API.
CREATE OR REPLACE FUNCTION public.protect_onboarding_completed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    NEW.onboarding_completed := OLD.onboarding_completed;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_onboarding_completed ON public.profiles;
CREATE TRIGGER protect_onboarding_completed
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_onboarding_completed();
