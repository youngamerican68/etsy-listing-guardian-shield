-- Migration: Add comprehensive monitoring for background policy processing
-- File: 20250712000001_background_processing_monitoring.sql

-- Create processing status tracking table
CREATE TABLE IF NOT EXISTS policy_processing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_policies INTEGER DEFAULT 0,
    total_sections_needed INTEGER DEFAULT 0,
    sections_processed INTEGER DEFAULT 0,
    sections_failed INTEGER DEFAULT 0,
    current_policy_id UUID,
    current_policy_category TEXT,
    current_section_title TEXT,
    last_processed_at TIMESTAMPTZ,
    last_error TEXT,
    processing_active BOOLEAN DEFAULT false,
    estimated_completion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create processing log table for detailed tracking
CREATE TABLE IF NOT EXISTS policy_processing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES etsy_policies(id),
    section_title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
    processing_time_ms INTEGER,
    error_message TEXT,
    ai_tokens_used INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_processing_log_status ON policy_processing_log(status);
CREATE INDEX IF NOT EXISTS idx_processing_log_created_at ON policy_processing_log(created_at);
CREATE INDEX IF NOT EXISTS idx_processing_log_policy_id ON policy_processing_log(policy_id);

-- Create function to get processing progress
CREATE OR REPLACE FUNCTION get_processing_progress()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_policies', (SELECT COUNT(*) FROM etsy_policies WHERE is_active = true),
        'total_sections', (SELECT COUNT(*) FROM policy_sections),
        'processing_active', (SELECT processing_active FROM policy_processing_status ORDER BY updated_at DESC LIMIT 1),
        'current_policy', (SELECT current_policy_category FROM policy_processing_status ORDER BY updated_at DESC LIMIT 1),
        'current_section', (SELECT current_section_title FROM policy_processing_status ORDER BY updated_at DESC LIMIT 1),
        'last_processed', (SELECT last_processed_at FROM policy_processing_status ORDER BY updated_at DESC LIMIT 1),
        'sections_today', (SELECT COUNT(*) FROM policy_processing_log WHERE created_at >= CURRENT_DATE),
        'success_rate', (
            SELECT CASE 
                WHEN COUNT(*) = 0 THEN 0 
                ELSE ROUND((COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / COUNT(*)) * 100, 1)
            END
            FROM policy_processing_log 
            WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        ),
        'estimated_completion', (SELECT estimated_completion FROM policy_processing_status ORDER BY updated_at DESC LIMIT 1)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update processing status
CREATE OR REPLACE FUNCTION update_processing_status(
    p_policy_id UUID DEFAULT NULL,
    p_policy_category TEXT DEFAULT NULL,
    p_section_title TEXT DEFAULT NULL,
    p_error TEXT DEFAULT NULL,
    p_active BOOLEAN DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO policy_processing_status (
        current_policy_id,
        current_policy_category, 
        current_section_title,
        last_processed_at,
        last_error,
        processing_active,
        updated_at
    ) VALUES (
        p_policy_id,
        p_policy_category,
        p_section_title,
        NOW(),
        p_error,
        COALESCE(p_active, true),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        current_policy_id = EXCLUDED.current_policy_id,
        current_policy_category = EXCLUDED.current_policy_category,
        current_section_title = EXCLUDED.current_section_title,
        last_processed_at = EXCLUDED.last_processed_at,
        last_error = EXCLUDED.last_error,
        processing_active = EXCLUDED.processing_active,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON policy_processing_status TO authenticated;
GRANT SELECT ON policy_processing_log TO authenticated;
GRANT EXECUTE ON FUNCTION get_processing_progress() TO authenticated;

-- Create RLS policies
ALTER TABLE policy_processing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_processing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view processing status" ON policy_processing_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view processing log" ON policy_processing_log FOR SELECT TO authenticated USING (true);

-- Insert initial status record
INSERT INTO policy_processing_status (
    total_policies,
    total_sections_needed,
    sections_processed,
    processing_active
) 
SELECT 
    (SELECT COUNT(*) FROM etsy_policies WHERE is_active = true),
    (SELECT COUNT(*) FROM etsy_policies WHERE is_active = true) * 5, -- Estimate 5 sections per policy
    (SELECT COUNT(*) FROM policy_sections),
    false
ON CONFLICT DO NOTHING;