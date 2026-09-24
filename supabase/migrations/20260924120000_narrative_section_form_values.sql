-- Province form fields that were missing from the live enum, so those
-- narratives could not be stored.
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'coordination_vaccination';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'coordination_nutrition';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'coordination_malaria';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'coordination_hmis';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'coordination_medicines';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'success_nutrition';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'success_malaria';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'lessons_learned';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'priorities_objective_2';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'priorities_objective_3';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'challenge_1';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'challenge_2';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'challenge_3';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'response_1';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'response_2';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'response_3';
