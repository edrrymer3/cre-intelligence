-- CreateTable
CREATE TABLE "Contact" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" TEXT,
    "title" TEXT,
    "linkedin_url" TEXT,
    "email" TEXT,
    "confidence" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "added_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachEmail" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "contact_id" INTEGER,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "generated_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sent_date" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "OutreachEmail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" SERIAL NOT NULL,
    "weekly_digest_enabled" BOOLEAN NOT NULL DEFAULT true,
    "digest_email" TEXT NOT NULL DEFAULT 'eddie@rymer.com',
    "commission_rate_psf" DOUBLE PRECISION NOT NULL DEFAULT 2.00,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachEmail" ADD CONSTRAINT "OutreachEmail_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutreachEmail" ADD CONSTRAINT "OutreachEmail_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default settings
INSERT INTO "AppSettings" ("weekly_digest_enabled", "digest_email", "commission_rate_psf") VALUES (true, 'eddie@rymer.com', 2.00);
