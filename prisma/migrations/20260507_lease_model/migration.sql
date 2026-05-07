CREATE TABLE "LeaseModel" (
    "id" SERIAL NOT NULL,
    "deal_id" INTEGER,
    "title" TEXT NOT NULL,
    "discount_rate" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "notes" TEXT,
    "created_by" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LeaseModel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeaseScenario" (
    "id" SERIAL NOT NULL,
    "model_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "suite" TEXT,
    "rsf" INTEGER,
    "start_date" TEXT,
    "term_months" INTEGER,
    "lease_type" TEXT DEFAULT 'NNN',
    "base_rent_psf" DOUBLE PRECISION,
    "expenses_psf" DOUBLE PRECISION,
    "rent_escalation" DOUBLE PRECISION DEFAULT 3.0,
    "free_rent_months" DOUBLE PRECISION DEFAULT 0,
    "free_rent_type" TEXT DEFAULT 'Gross',
    "ti_allowance_psf" DOUBLE PRECISION,
    "capex_psf" DOUBLE PRECISION,
    "parking_cost_monthly" DOUBLE PRECISION,
    "parking_spaces" INTEGER,
    "notes" TEXT,
    "total_occupancy_cost" DOUBLE PRECISION,
    "annual_avg_cost" DOUBLE PRECISION,
    "avg_cost_psf" DOUBLE PRECISION,
    "npv" DOUBLE PRECISION,
    "net_effective_rent_psf" DOUBLE PRECISION,
    "cash_flows" JSONB,
    CONSTRAINT "LeaseScenario_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LeaseScenario" ADD CONSTRAINT "LeaseScenario_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "LeaseModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "LeaseModel_deal_id_idx" ON "LeaseModel"("deal_id");
