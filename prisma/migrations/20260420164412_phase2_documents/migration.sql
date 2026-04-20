-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_date" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentProperty" (
    "id" SERIAL NOT NULL,
    "document_id" INTEGER NOT NULL,
    "property_name" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "property_type" TEXT,
    "total_sqft" INTEGER,
    "asking_price" DOUBLE PRECISION,
    "noi" DOUBLE PRECISION,
    "cap_rate" DOUBLE PRECISION,
    "occupancy_rate" DOUBLE PRECISION,
    "year_built" INTEGER,
    "notes" TEXT,

    CONSTRAINT "DocumentProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTenant" (
    "id" SERIAL NOT NULL,
    "document_property_id" INTEGER NOT NULL,
    "matched_company_id" INTEGER,
    "tenant_name" TEXT,
    "sqft" INTEGER,
    "lease_expiration_year" INTEGER,
    "lease_expiration_month" INTEGER,
    "rent_psf" DOUBLE PRECISION,
    "lease_type" TEXT,
    "options" TEXT,
    "notes" TEXT,

    CONSTRAINT "DocumentTenant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DocumentProperty" ADD CONSTRAINT "DocumentProperty_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTenant" ADD CONSTRAINT "DocumentTenant_document_property_id_fkey" FOREIGN KEY ("document_property_id") REFERENCES "DocumentProperty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTenant" ADD CONSTRAINT "DocumentTenant_matched_company_id_fkey" FOREIGN KEY ("matched_company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
