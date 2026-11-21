-- ============================================================================
-- LUMIO FINANCE — ADMIN-ONLY TRANSACTIONAL EMAIL PROVIDER SETTINGS
-- Migration: 20261121_email_provider_settings.sql
-- Idempotent: Safe to run multiple times in Supabase SQL Editor.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_settings (
  id text PRIMARY KEY DEFAULT 'global',
  active_provider text NOT NULL DEFAULT 'BREVO',
  from_name text NOT NULL DEFAULT 'Lumio Finance',
  from_email text NOT NULL DEFAULT 'no-reply@esaico.com',
  reply_to text NOT NULL DEFAULT 'willysaico@gmail.com',
  site_url text NOT NULL DEFAULT 'https://lumio.esaico.com',
  brevo_api_key text NOT NULL DEFAULT '',
  resend_api_key text NOT NULL DEFAULT '',
  sendgrid_api_key text NOT NULL DEFAULT '',
  smtp_host text NOT NULL DEFAULT 'smtp-relay.brevo.com',
  smtp_port int4 NOT NULL DEFAULT 587,
  smtp_secure boolean NOT NULL DEFAULT false,
  smtp_user text NOT NULL DEFAULT '',
  smtp_pass text NOT NULL DEFAULT '',
  webhook_url text NOT NULL DEFAULT '',
  webhook_secret text NOT NULL DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_settings_active_provider_check'
  ) THEN
    ALTER TABLE public.email_settings
      ADD CONSTRAINT email_settings_active_provider_check
      CHECK (active_provider IN ('BREVO', 'RESEND', 'SENDGRID', 'SMTP', 'WEBHOOK'));
  END IF;
END $$;

INSERT INTO public.email_settings (
  id,
  active_provider,
  from_name,
  from_email,
  reply_to,
  site_url,
  smtp_host,
  smtp_port,
  smtp_secure
)
VALUES (
  'global',
  'BREVO',
  'Lumio Finance',
  'no-reply@esaico.com',
  'willysaico@gmail.com',
  'https://lumio.esaico.com',
  'smtp-relay.brevo.com',
  587,
  false
)
ON CONFLICT (id) DO NOTHING;

-- STRICT ADMIN-ONLY RLS (NEVER allow public read on email credentials)
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_settings_admin_all" ON public.email_settings;
CREATE POLICY "email_settings_admin_all" ON public.email_settings
  FOR ALL USING (public.is_lumio_admin()) WITH CHECK (public.is_lumio_admin());
