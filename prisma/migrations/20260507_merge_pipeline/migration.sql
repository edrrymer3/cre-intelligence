-- Add contact fields to Deal for pipeline merge
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "contact_name" TEXT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "contact_title" TEXT;

-- Migrate existing Pipeline records into Deal table
INSERT INTO "Deal" (deal_name, status, contact_name, contact_title, notes, created_date, last_updated, company_id)
SELECT 
  COALESCE(c.name, 'Untitled Deal') as deal_name,
  CASE p.status
    WHEN 'Contacted' THEN 'Contacted'
    WHEN 'Meeting Set' THEN 'Meeting Set'
    WHEN 'Proposal' THEN 'Proposal'
    WHEN 'Engaged' THEN 'Negotiating'
    WHEN 'Closed' THEN 'Closed'
    ELSE p.status
  END as status,
  p.contact_name,
  p.contact_title,
  p.notes,
  p.added_date,
  p.last_updated,
  p.company_id
FROM "Pipeline" p
LEFT JOIN "Company" c ON c.id = p.company_id;
