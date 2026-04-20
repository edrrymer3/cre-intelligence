-- Add channel to OutreachEmail
ALTER TABLE "OutreachEmail" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'email';

-- CreateTable ResearchReport
CREATE TABLE "ResearchReport" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "report_text" TEXT NOT NULL,
    "opportunity_rating" TEXT NOT NULL,
    "generated_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable PriorityScore
CREATE TABLE "PriorityScore" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "lease_points" INTEGER NOT NULL DEFAULT 0,
    "trigger_points" INTEGER NOT NULL DEFAULT 0,
    "market_points" INTEGER NOT NULL DEFAULT 0,
    "engagement_points" INTEGER NOT NULL DEFAULT 0,
    "breakdown" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PriorityScore_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex on company_id for PriorityScore
CREATE UNIQUE INDEX "PriorityScore_company_id_key" ON "PriorityScore"("company_id");

-- AddForeignKey
ALTER TABLE "ResearchReport" ADD CONSTRAINT "ResearchReport_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriorityScore" ADD CONSTRAINT "PriorityScore_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Index for performance
CREATE INDEX "ResearchReport_company_id_idx" ON "ResearchReport"("company_id");
CREATE INDEX "ResearchReport_generated_date_idx" ON "ResearchReport"("generated_date");
