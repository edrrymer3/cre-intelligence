CREATE TABLE "BuildingSurvey" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "building_name" TEXT,
    "city" TEXT,
    "state" TEXT NOT NULL DEFAULT 'MN',
    "zip" TEXT,
    "property_type" TEXT,
    "building_class" TEXT,
    "total_sf" INTEGER,
    "floors" INTEGER,
    "year_built" INTEGER,
    "year_renovated" INTEGER,
    "parking_ratio" TEXT,
    "owner" TEXT,
    "landlord" TEXT,
    "property_manager" TEXT,
    "amenities" TEXT,
    "notes" TEXT,
    "source_file" TEXT,
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" TEXT,
    CONSTRAINT "BuildingSurvey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuildingSurveyYear" (
    "id" SERIAL NOT NULL,
    "survey_id" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "asking_rate_psf" DOUBLE PRECISION,
    "effective_rate_psf" DOUBLE PRECISION,
    "cam_psf" DOUBLE PRECISION,
    "tax_psf" DOUBLE PRECISION,
    "insurance_psf" DOUBLE PRECISION,
    "total_nnn_psf" DOUBLE PRECISION,
    "occupancy_rate" DOUBLE PRECISION,
    "free_rent_months" INTEGER,
    "ti_psf" DOUBLE PRECISION,
    "notes" TEXT,
    CONSTRAINT "BuildingSurveyYear_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BuildingSurveyPhoto" (
    "id" SERIAL NOT NULL,
    "survey_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BuildingSurveyPhoto_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BuildingSurveyYear" ADD CONSTRAINT "BuildingSurveyYear_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "BuildingSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuildingSurveyPhoto" ADD CONSTRAINT "BuildingSurveyPhoto_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "BuildingSurvey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "BuildingSurvey_city_idx" ON "BuildingSurvey"("city");
CREATE INDEX "BuildingSurvey_property_type_idx" ON "BuildingSurvey"("property_type");
CREATE INDEX "BuildingSurveyYear_survey_id_idx" ON "BuildingSurveyYear"("survey_id");
CREATE INDEX "BuildingSurveyYear_year_idx" ON "BuildingSurveyYear"("year");
