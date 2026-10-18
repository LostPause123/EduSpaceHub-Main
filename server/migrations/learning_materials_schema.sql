-- ==============================================================================
-- Migration: Learning Materials Schema & Policies
-- ==============================================================================

-- 1. Ensure learning_materials table has all required columns
ALTER TABLE public.learning_materials
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS original_filename text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS review_feedback text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_history jsonb DEFAULT '[]'::jsonb;

-- 2. Add status check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'learning_materials_status_check'
  ) THEN
    ALTER TABLE public.learning_materials
      ADD CONSTRAINT learning_materials_status_check
      CHECK (status IN (
        'processing',
        'pending_review',
        'revision_requested',
        'rejected',
        'approved',
        'published',
        'archived'
      ));
  END IF;
END $$;

-- 3. Indexes for fast query filtering
CREATE INDEX IF NOT EXISTS idx_learning_materials_tutor_id ON public.learning_materials(tutor_id);
CREATE INDEX IF NOT EXISTS idx_learning_materials_status ON public.learning_materials(status);
CREATE INDEX IF NOT EXISTS idx_learning_materials_subject ON public.learning_materials(subject);
CREATE INDEX IF NOT EXISTS idx_learning_materials_is_public ON public.learning_materials(is_public);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.learning_materials ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies:
-- Allow authenticated tutors to select their own materials
CREATE POLICY "Tutors can view own materials"
  ON public.learning_materials FOR SELECT
  TO authenticated
  USING (
    tutor_id IN (
      SELECT id FROM public.tutors WHERE profile_id = auth.uid()
    )
  );

-- Allow authenticated tutors to insert their own materials (must be pending_review or processing)
CREATE POLICY "Tutors can insert own materials"
  ON public.learning_materials FOR INSERT
  TO authenticated
  WITH CHECK (
    tutor_id IN (
      SELECT id FROM public.tutors WHERE profile_id = auth.uid()
    )
    AND status IN ('processing', 'pending_review')
  );

-- Allow authenticated tutors to update their own materials (cannot change status to approved/published)
CREATE POLICY "Tutors can update own materials when revision requested or pending"
  ON public.learning_materials FOR UPDATE
  TO authenticated
  USING (
    tutor_id IN (
      SELECT id FROM public.tutors WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    tutor_id IN (
      SELECT id FROM public.tutors WHERE profile_id = auth.uid()
    )
    AND status NOT IN ('approved', 'published')
  );

-- Allow students to view published materials
CREATE POLICY "Students can view published materials"
  ON public.learning_materials FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND is_public = true
  );

-- Allow admins full access to learning materials
CREATE POLICY "Admins have full access to learning materials"
  ON public.learning_materials FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
