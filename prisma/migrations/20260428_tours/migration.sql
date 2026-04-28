CREATE TABLE "Tour" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "client_email" TEXT,
    "deal_id" INTEGER,
    "tour_date" TIMESTAMP(3),
    "share_token" TEXT NOT NULL,
    "notes" TEXT,
    "created_by" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Tour_share_token_key" ON "Tour"("share_token");

CREATE TABLE "TourSpace" (
    "id" SERIAL NOT NULL,
    "tour_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "building_name" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "floor" TEXT,
    "sqft" INTEGER,
    "asking_rate_psf" DOUBLE PRECISION,
    "lease_type" TEXT,
    "term_years" INTEGER,
    "available_date" TEXT,
    "landlord" TEXT,
    "landlord_rep" TEXT,
    "amenities" TEXT,
    "parking" TEXT,
    "transit_score" TEXT,
    "virtual_tour_url" TEXT,
    "building_url" TEXT,
    "floor_plan_url" TEXT,
    "notes" TEXT,
    "broker_rating" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "custom_fields" JSONB,
    CONSTRAINT "TourSpace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TourPhoto" (
    "id" SERIAL NOT NULL,
    "space_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TourPhoto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClientComment" (
    "id" SERIAL NOT NULL,
    "tour_id" INTEGER NOT NULL,
    "space_id" INTEGER,
    "comment" TEXT NOT NULL,
    "rating" INTEGER,
    "client_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TourSpace" ADD CONSTRAINT "TourSpace_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TourPhoto" ADD CONSTRAINT "TourPhoto_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "TourSpace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
