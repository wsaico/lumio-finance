-- Migration: Add icon column to subcategories
-- Description: This column stores the Lucide icon name for each subcategory.

ALTER TABLE "public"."subcategories" ADD COLUMN IF NOT EXISTS "icon" TEXT;
