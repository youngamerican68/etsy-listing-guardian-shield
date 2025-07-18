-- Update the risk_level constraint to allow all risk levels
-- Run this in the Supabase SQL Editor

-- First, drop the existing constraint
ALTER TABLE compliance_rules DROP CONSTRAINT IF EXISTS compliance_rules_risk_level_check;

-- Add the new constraint with all risk levels
ALTER TABLE compliance_rules ADD CONSTRAINT compliance_rules_risk_level_check 
CHECK (risk_level IN ('critical', 'high', 'medium', 'low', 'warning'));

-- Verify the constraint was updated
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'compliance_rules_risk_level_check';