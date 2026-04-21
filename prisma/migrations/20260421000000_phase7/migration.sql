-- WaitlistEmail
CREATE TABLE "WaitlistEmail" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "brokerage" TEXT,
    "market" TEXT,
    "submitted_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WaitlistEmail_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaitlistEmail_email_key" ON "WaitlistEmail"("email");

-- HubSpot fields
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "hubspot_company_id" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "hubspot_contact_id" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "hubspot_deal_id" TEXT;

-- AppSettings new columns
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "hubspot_api_key" TEXT;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "hubspot_auto_sync" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "hubspot_last_synced" TIMESTAMP(3);
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "google_access_token" TEXT;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "google_refresh_token" TEXT;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "google_sync_followups" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "google_sync_milestones" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "google_sync_lease_alerts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "slack_webhook_url" TEXT;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "slack_notify_alerts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "slack_notify_news" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "slack_notify_research" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "slack_notify_followups" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "slack_notify_milestones" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AppSettings" ADD COLUMN IF NOT EXISTS "slack_notify_digest" BOOLEAN NOT NULL DEFAULT true;
