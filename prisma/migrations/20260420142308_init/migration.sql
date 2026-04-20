-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT,
    "cik" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "hq_city" TEXT,
    "hq_state" TEXT,
    "incorporated_state" TEXT,
    "include_override" BOOLEAN NOT NULL DEFAULT false,
    "override_reason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "added_by" TEXT,
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "REIT" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ticker" TEXT,
    "cik" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "REIT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filing" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "reit_id" INTEGER,
    "filing_type" TEXT NOT NULL,
    "filing_date" TIMESTAMP(3) NOT NULL,
    "period" TEXT,
    "raw_text_url" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_date" TIMESTAMP(3),

    CONSTRAINT "Filing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "reit_id" INTEGER,
    "tenant_name" TEXT,
    "property_type" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "sqft" INTEGER,
    "lease_expiration_year" INTEGER,
    "lease_type" TEXT,
    "percent_of_building" DOUBLE PRECISION,
    "occupancy_trend" TEXT,
    "opportunity_score" INTEGER,
    "real_estate_strategy" TEXT,
    "trigger_events" TEXT[],
    "recommended_action" TEXT,
    "notes" TEXT,
    "contacted" BOOLEAN NOT NULL DEFAULT false,
    "filing_date" TIMESTAMP(3),
    "filing_url" TEXT,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "alert_type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "filing_date" TIMESTAMP(3) NOT NULL,
    "filing_url" TEXT,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "contact_name" TEXT,
    "contact_title" TEXT,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_cik_key" ON "Company"("cik");

-- CreateIndex
CREATE UNIQUE INDEX "REIT_cik_key" ON "REIT"("cik");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Filing" ADD CONSTRAINT "Filing_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filing" ADD CONSTRAINT "Filing_reit_id_fkey" FOREIGN KEY ("reit_id") REFERENCES "REIT"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_reit_id_fkey" FOREIGN KEY ("reit_id") REFERENCES "REIT"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
