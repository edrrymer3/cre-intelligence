-- Create Organization table
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- Seed default org for Eddie
INSERT INTO "Organization" ("name", "slug", "plan") VALUES ('Apex Tenant Advisors', 'apex', 'pro');

-- Add org_id to all top-level tables (nullable first, then set value, then add default)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "REIT" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "Pipeline" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "Tour" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "LeaseModel" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "BuildingSurvey" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "ProposalAnalysis" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "MarketIntel" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "PrivateCompany" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "CompanyNews" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "PortfolioClient" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "TeamNote" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "TeamAssignment" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "RFPTemplate" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "RFPResponse" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "PitchTemplate" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;
ALTER TABLE "PitchDeck" ADD COLUMN IF NOT EXISTS "org_id" INTEGER;

-- Set all existing records to org_id = 1
UPDATE "User" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "Company" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "REIT" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "Alert" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "Pipeline" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "Contact" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "Deal" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "Client" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "Tour" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "Document" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "LeaseModel" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "BuildingSurvey" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "ProposalAnalysis" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "MarketIntel" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "PrivateCompany" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "CompanyNews" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "PortfolioClient" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "TeamNote" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "TeamAssignment" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "RFPTemplate" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "RFPResponse" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "PitchTemplate" SET "org_id" = 1 WHERE "org_id" IS NULL;
UPDATE "PitchDeck" SET "org_id" = 1 WHERE "org_id" IS NULL;

-- Set NOT NULL with default 1
ALTER TABLE "User" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "Company" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "REIT" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "Alert" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "Pipeline" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "Contact" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "Deal" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "Client" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "Tour" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "Document" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "LeaseModel" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "BuildingSurvey" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "ProposalAnalysis" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "MarketIntel" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "PrivateCompany" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "CompanyNews" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "PortfolioClient" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "TeamNote" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "TeamAssignment" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "RFPTemplate" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "RFPResponse" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "PitchTemplate" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;
ALTER TABLE "PitchDeck" ALTER COLUMN "org_id" SET NOT NULL, ALTER COLUMN "org_id" SET DEFAULT 1;

-- Foreign key from User to Organization
ALTER TABLE "User" ADD CONSTRAINT "User_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes for performance
CREATE INDEX "Company_org_id_idx" ON "Company"("org_id");
CREATE INDEX "REIT_org_id_idx" ON "REIT"("org_id");
CREATE INDEX "Alert_org_id_idx" ON "Alert"("org_id");
CREATE INDEX "Contact_org_id_idx" ON "Contact"("org_id");
CREATE INDEX "Deal_org_id_idx" ON "Deal"("org_id");
CREATE INDEX "Client_org_id_idx" ON "Client"("org_id");
CREATE INDEX "MarketIntel_org_id_idx" ON "MarketIntel"("org_id");
CREATE INDEX "User_org_id_idx" ON "User"("org_id");
