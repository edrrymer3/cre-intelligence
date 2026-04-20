-- CompanyNews
CREATE TABLE "CompanyNews" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "relevance_score" INTEGER NOT NULL,
    "source_url" TEXT,
    "published_date" TIMESTAMP(3),
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "CompanyNews_pkey" PRIMARY KEY ("id")
);

-- TeamNote
CREATE TABLE "TeamNote" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "contact_id" INTEGER,
    "client_id" INTEGER,
    "author" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TeamNote_pkey" PRIMARY KEY ("id")
);

-- TeamAssignment
CREATE TABLE "TeamAssignment" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "contact_id" INTEGER,
    "assigned_to" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assigned_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "TeamAssignment_pkey" PRIMARY KEY ("id")
);

-- Deal
CREATE TABLE "Deal" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "client_id" INTEGER,
    "deal_name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "property_type" TEXT,
    "target_city" TEXT,
    "target_state" TEXT,
    "target_sf_min" INTEGER,
    "target_sf_max" INTEGER,
    "target_move_date" TIMESTAMP(3),
    "estimated_value_sf" DOUBLE PRECISION,
    "estimated_commission" DOUBLE PRECISION,
    "probability" INTEGER,
    "assigned_to" TEXT,
    "notes" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- DealMilestone
CREATE TABLE "DealMilestone" (
    "id" SERIAL NOT NULL,
    "deal_id" INTEGER NOT NULL,
    "milestone" TEXT NOT NULL,
    "due_date" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_date" TIMESTAMP(3),
    "notes" TEXT,
    CONSTRAINT "DealMilestone_pkey" PRIMARY KEY ("id")
);

-- DealSpace
CREATE TABLE "DealSpace" (
    "id" SERIAL NOT NULL,
    "deal_id" INTEGER NOT NULL,
    "building_name" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "floor" TEXT,
    "sqft" INTEGER,
    "asking_rate_psf" DOUBLE PRECISION,
    "concessions" TEXT,
    "term_years" INTEGER,
    "status" TEXT,
    "notes" TEXT,
    CONSTRAINT "DealSpace_pkey" PRIMARY KEY ("id")
);

-- PropertyComparison
CREATE TABLE "PropertyComparison" (
    "id" SERIAL NOT NULL,
    "deal_id" INTEGER NOT NULL,
    "spaces" JSONB NOT NULL,
    "ai_analysis" TEXT,
    "generated_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyComparison_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "CompanyNews" ADD CONSTRAINT "CompanyNews_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TeamNote" ADD CONSTRAINT "TeamNote_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamNote" ADD CONSTRAINT "TeamNote_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamAssignment" ADD CONSTRAINT "TeamAssignment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamAssignment" ADD CONSTRAINT "TeamAssignment_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DealMilestone" ADD CONSTRAINT "DealMilestone_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DealSpace" ADD CONSTRAINT "DealSpace_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyComparison" ADD CONSTRAINT "PropertyComparison_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "CompanyNews_company_id_idx" ON "CompanyNews"("company_id");
CREATE INDEX "CompanyNews_added_date_idx" ON "CompanyNews"("added_date");
CREATE INDEX "TeamNote_company_id_idx" ON "TeamNote"("company_id");
CREATE INDEX "TeamAssignment_company_id_idx" ON "TeamAssignment"("company_id");
CREATE INDEX "TeamAssignment_assigned_to_idx" ON "TeamAssignment"("assigned_to");
CREATE INDEX "Deal_status_idx" ON "Deal"("status");
CREATE INDEX "Deal_assigned_to_idx" ON "Deal"("assigned_to");
