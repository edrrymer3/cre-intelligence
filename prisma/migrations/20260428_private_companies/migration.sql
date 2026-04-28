CREATE TABLE "PrivateCompany" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "hq_city" TEXT,
    "hq_state" TEXT,
    "employee_count" INTEGER,
    "estimated_sf" INTEGER,
    "location_count" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "added_by" TEXT,
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "opportunity_score" INTEGER,
    CONSTRAINT "PrivateCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PrivateCompanyLocation" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "property_type" TEXT,
    "sqft" INTEGER,
    "lease_expiration" INTEGER,
    "notes" TEXT,
    CONSTRAINT "PrivateCompanyLocation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PrivateCompanyLocation" ADD CONSTRAINT "PrivateCompanyLocation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "PrivateCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "PrivateCompany_hq_state_idx" ON "PrivateCompany"("hq_state");
CREATE INDEX "PrivateCompanyLocation_company_id_idx" ON "PrivateCompanyLocation"("company_id");
