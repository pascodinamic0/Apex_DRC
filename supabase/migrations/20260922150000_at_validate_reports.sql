-- AT-only provincial validation: move validate_reports from DT to AT.

CREATE OR REPLACE FUNCTION public.seed_default_duties_for_user(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  IF user_role IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.user_duties WHERE user_id = _user_id;

  IF user_role = 'province_user'::public.app_role THEN
    INSERT INTO public.user_duties (user_id, duty) VALUES
      (_user_id, 'edit_reports'),
      (_user_id, 'submit_reports');
    UPDATE public.profiles SET access_level = 'edit' WHERE id = _user_id;
  ELSIF user_role = 'technical_director'::public.app_role THEN
    INSERT INTO public.user_duties (user_id, duty) VALUES
      (_user_id, 'comment_consolidation'),
      (_user_id, 'write_national_summary'),
      (_user_id, 'manage_users'),
      (_user_id, 'manage_provinces');
    UPDATE public.profiles SET access_level = 'edit' WHERE id = _user_id;
  ELSIF user_role = 'technical_assistant'::public.app_role THEN
    INSERT INTO public.user_duties (user_id, duty) VALUES
      (_user_id, 'validate_reports'),
      (_user_id, 'comment_consolidation');
    UPDATE public.profiles SET access_level = 'edit' WHERE id = _user_id;
  ELSIF user_role = 'read_only'::public.app_role THEN
    UPDATE public.profiles SET access_level = 'view' WHERE id = _user_id;
  END IF;
END;
$$;

-- Remove validate_reports from all DT accounts.
DELETE FROM public.user_duties ud
USING public.user_roles ur
WHERE ud.user_id = ur.user_id
  AND ur.role = 'technical_director'::public.app_role
  AND ud.duty = 'validate_reports'::public.app_duty;

-- Grant validate_reports to AT accounts with edit access.
INSERT INTO public.user_duties (user_id, duty)
SELECT ur.user_id, 'validate_reports'::public.app_duty
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'technical_assistant'::public.app_role
  AND p.access_level = 'edit'::public.access_level
ON CONFLICT (user_id, duty) DO NOTHING;
