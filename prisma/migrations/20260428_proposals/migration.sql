CREATE TABLE "ProposalAnalysis" (
    "id" SERIAL NOT NULL,
    "deal_id" INTEGER,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT,
    "landlord" TEXT,
    "building_name" TEXT,
    "city" TEXT,
    "state" TEXT,
    "sqft" INTEGER,
    "term_years" INTEGER,
    "base_rent_psf" DOUBLE PRECISION,
    "rent_escalation" DOUBLE PRECISION,
    "free_rent_months" INTEGER,
    "ti_psf" DOUBLE PRECISION,
    "other_concessions" TEXT,
    "total_cost" DOUBLE PRECISION,
    "effective_rent_psf" DOUBLE PRECISION,
    "npv" DOUBLE PRECISION,
    "ai_summary" TEXT,
    "raw_data" JSONB,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT,
    CONSTRAINT "ProposalAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RFPTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "file_name" TEXT,
    "content" TEXT NOT NULL,
    "is_example" BOOLEAN NOT NULL DEFAULT false,
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RFPTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RFPResponse" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "deal_id" INTEGER,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "generated_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "RFPResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PitchTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PitchTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PitchDeck" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "generated_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "PitchDeck_pkey" PRIMARY KEY ("id")
);
