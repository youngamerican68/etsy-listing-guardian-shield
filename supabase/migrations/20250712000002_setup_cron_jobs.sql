-- Setup cron jobs for automated policy processing
-- File: 20250712000002_setup_cron_jobs.sql

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to trigger edge function processing
CREATE OR REPLACE FUNCTION trigger_policy_processing()
RETURNS VOID AS $$
DECLARE
    processing_status RECORD;
BEGIN
    -- Check if processing is already active
    SELECT * INTO processing_status 
    FROM policy_processing_status 
    ORDER BY updated_at DESC 
    LIMIT 1;
    
    -- Only trigger if not currently processing
    IF processing_status.processing_active = false OR processing_status.processing_active IS NULL THEN
        -- Call the edge function (this will be triggered by cron)
        PERFORM net.http_post(
            url := 'https://youjypiuqxlvyizlszmd.supabase.co/functions/v1/process-single-section',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
            body := '{}'::jsonb
        );
        
        -- Log the trigger
        INSERT INTO policy_processing_log (
            policy_id, 
            section_title, 
            status
        ) VALUES (
            NULL, 
            'CRON_TRIGGER', 
            'started'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run every 5 minutes
-- This will process one section every 5 minutes automatically
SELECT cron.schedule(
    'policy_processing_job',           -- job name
    '*/5 * * * *',                     -- cron schedule (every 5 minutes)
    'SELECT trigger_policy_processing();'  -- SQL command
);

-- Create function to start/stop processing manually
CREATE OR REPLACE FUNCTION toggle_policy_processing(enable_processing BOOLEAN)
RETURNS TEXT AS $$
BEGIN
    IF enable_processing THEN
        -- Enable the cron job
        UPDATE cron.job 
        SET active = true 
        WHERE jobname = 'policy_processing_job';
        
        RETURN 'Policy processing enabled - will run every 5 minutes';
    ELSE
        -- Disable the cron job
        UPDATE cron.job 
        SET active = false 
        WHERE jobname = 'policy_processing_job';
        
        -- Mark current processing as inactive
        UPDATE policy_processing_status 
        SET processing_active = false, 
            updated_at = NOW();
            
        RETURN 'Policy processing disabled';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION trigger_policy_processing() TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_policy_processing(BOOLEAN) TO authenticated;

-- Create admin-only function to manually trigger processing
CREATE OR REPLACE FUNCTION manual_trigger_processing()
RETURNS TEXT AS $$
BEGIN
    -- Check if user is admin
    IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin' THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;
    
    -- Trigger processing
    PERFORM trigger_policy_processing();
    
    RETURN 'Processing triggered manually';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION manual_trigger_processing() TO authenticated;

-- Insert initial comment about cron job
INSERT INTO policy_processing_log (
    policy_id,
    section_title,
    status
) VALUES (
    NULL,
    'SYSTEM_SETUP',
    'completed'
);