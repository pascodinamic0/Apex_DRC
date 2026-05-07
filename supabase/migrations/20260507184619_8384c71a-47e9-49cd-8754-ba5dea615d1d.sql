
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  local_part TEXT;
  pv_id UUID;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  local_part := lower(split_part(NEW.email, '@', 1));

  IF local_part = 'director' THEN
    assigned_role := 'technical_director';
  ELSIF local_part = 'viewer' THEN
    assigned_role := 'read_only';
  ELSE
    assigned_role := 'province_user';
    -- Try match province by code (lowercase) or name slug
    SELECT id INTO pv_id FROM public.provinces
    WHERE lower(code) = local_part
       OR lower(replace(replace(name,' ','-'),'ï','i')) = local_part
       OR lower(split_part(name,' ',1)) = local_part
    LIMIT 1;
    IF pv_id IS NOT NULL THEN
      UPDATE public.profiles SET province_id = pv_id WHERE id = NEW.id;
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END $$;
