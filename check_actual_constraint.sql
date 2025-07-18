-- Check the actual constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'compliance_rules'::regclass 
    AND conname = 'compliance_rules_risk_level_check';