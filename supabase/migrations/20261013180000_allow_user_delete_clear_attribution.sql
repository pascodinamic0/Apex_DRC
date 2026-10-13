-- Account deletion was failing with "Database error deleting user" because
-- attribution columns reference auth.users without ON DELETE. Keep the
-- historical rows and clear the deleted user's id.

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_created_by_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_returned_by_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_returned_by_fkey
  FOREIGN KEY (returned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_validated_by_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_validated_by_fkey
  FOREIGN KEY (validated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.report_photos DROP CONSTRAINT IF EXISTS report_photos_uploaded_by_fkey;
ALTER TABLE public.report_photos
  ADD CONSTRAINT report_photos_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.consolidation_summaries DROP CONSTRAINT IF EXISTS consolidation_summaries_generated_by_fkey;
ALTER TABLE public.consolidation_summaries
  ADD CONSTRAINT consolidation_summaries_generated_by_fkey
  FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.consolidation_summaries DROP CONSTRAINT IF EXISTS consolidation_summaries_updated_by_fkey;
ALTER TABLE public.consolidation_summaries
  ADD CONSTRAINT consolidation_summaries_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.consolidation_activity_summaries DROP CONSTRAINT IF EXISTS consolidation_activity_summaries_generated_by_fkey;
ALTER TABLE public.consolidation_activity_summaries
  ADD CONSTRAINT consolidation_activity_summaries_generated_by_fkey
  FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.consolidation_activity_summaries DROP CONSTRAINT IF EXISTS consolidation_activity_summaries_updated_by_fkey;
ALTER TABLE public.consolidation_activity_summaries
  ADD CONSTRAINT consolidation_activity_summaries_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.report_comments ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.report_comments DROP CONSTRAINT IF EXISTS report_comments_author_id_fkey;
ALTER TABLE public.report_comments
  ADD CONSTRAINT report_comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.section_approvals ALTER COLUMN approved_by DROP NOT NULL;
ALTER TABLE public.section_approvals DROP CONSTRAINT IF EXISTS section_approvals_approved_by_fkey;
ALTER TABLE public.section_approvals
  ADD CONSTRAINT section_approvals_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.consolidation_approvals ALTER COLUMN approved_by DROP NOT NULL;
ALTER TABLE public.consolidation_approvals DROP CONSTRAINT IF EXISTS consolidation_approvals_approved_by_fkey;
ALTER TABLE public.consolidation_approvals
  ADD CONSTRAINT consolidation_approvals_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.consolidation_activity_comments ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.consolidation_activity_comments DROP CONSTRAINT IF EXISTS consolidation_activity_comments_author_id_fkey;
ALTER TABLE public.consolidation_activity_comments
  ADD CONSTRAINT consolidation_activity_comments_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;
