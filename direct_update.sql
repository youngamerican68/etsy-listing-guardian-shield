-- Direct SQL update to change warning to low
UPDATE compliance_rules 
SET risk_level = 'low' 
WHERE risk_level = 'warning';

-- Check the results
SELECT risk_level, COUNT(*) as count 
FROM compliance_rules 
GROUP BY risk_level 
ORDER BY risk_level;