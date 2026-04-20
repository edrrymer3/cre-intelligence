-- CreateTable ContactActivity
CREATE TABLE "ContactActivity" (
    "id" SERIAL NOT NULL,
    "contact_id" INTEGER NOT NULL,
    "activity_type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "activity_date" TIMESTAMP(3) NOT NULL,
    "added_by" TEXT NOT NULL,
    "follow_up_date" TIMESTAMP(3),
    "follow_up_note" TEXT,
    CONSTRAINT "ContactActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable MarketIntel
CREATE TABLE "MarketIntel" (
    "id" SERIAL NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "relevance_score" INTEGER NOT NULL,
    "source_url" TEXT,
    "published_date" TIMESTAMP(3),
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MarketIntel_pkey" PRIMARY KEY ("id")
);

-- CreateTable Client
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "hq_city" TEXT,
    "hq_state" TEXT,
    "employee_count" INTEGER,
    "notes" TEXT,
    "added_by" TEXT NOT NULL,
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClientLocation
CREATE TABLE "ClientLocation" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "property_name" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "property_type" TEXT NOT NULL,
    "sqft" INTEGER,
    "lease_expiration" TIMESTAMP(3),
    "landlord" TEXT,
    "annual_rent" DOUBLE PRECISION,
    "commission_earned" DOUBLE PRECISION,
    "notes" TEXT,
    CONSTRAINT "ClientLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClientContact
CREATE TABLE "ClientContact" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "linkedin_url" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    CONSTRAINT "ClientContact_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContactActivity" ADD CONSTRAINT "ContactActivity_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientLocation" ADD CONSTRAINT "ClientLocation_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientContact" ADD CONSTRAINT "ClientContact_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes for performance (Step 25 requirement)
CREATE INDEX "Property_lease_expiration_year_idx" ON "Property"("lease_expiration_year");
CREATE INDEX "Alert_filing_date_idx" ON "Alert"("filing_date");
CREATE INDEX "Contact_company_id_idx" ON "Contact"("company_id");
CREATE INDEX "ContactActivity_contact_id_idx" ON "ContactActivity"("contact_id");
CREATE INDEX "ContactActivity_follow_up_date_idx" ON "ContactActivity"("follow_up_date");
CREATE INDEX "MarketIntel_relevance_score_idx" ON "MarketIntel"("relevance_score");
CREATE INDEX "MarketIntel_added_date_idx" ON "MarketIntel"("added_date");
