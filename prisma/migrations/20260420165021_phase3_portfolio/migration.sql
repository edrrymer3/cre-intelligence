-- CreateTable
CREATE TABLE "PortfolioClient" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "primary_contact" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "notes" TEXT,
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioLocation" (
    "id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "company_id" INTEGER,
    "property_name" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "property_type" TEXT,
    "sqft" INTEGER,
    "annual_rent" DOUBLE PRECISION,
    "lease_expiration_date" TIMESTAMP(3),
    "lease_type" TEXT,
    "landlord" TEXT,
    "notes" TEXT,

    CONSTRAINT "PortfolioLocation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PortfolioLocation" ADD CONSTRAINT "PortfolioLocation_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "PortfolioClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioLocation" ADD CONSTRAINT "PortfolioLocation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
