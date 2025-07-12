// src/pages/Index.tsx OR src/components/dashboard/PolicyParserManager.tsx
// FINAL, "SMART MANAGER" VERSION

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, FileText, Brain, Hash, Play, StopCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { policyParserService } from '@/services/policyParserService';
import { StartJobResult } from '@/services/policyJobService';
import { supabase } from '@/integrations/supabase/client';
import JobProgressMonitor from '@/components/dashboard/JobProgressMonitor';
import { extractTableOfContents, findSectionContent, generateHash } from '@/lib/policyUtils';

// Define Policy type
type Policy = {
  id: string;
  category: string;
  content: string;
};

const PolicyParserManager = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [result, setResult] = useState<StartJobResult | null>(null);
  const [processedPoliciesCount, setProcessedPoliciesCount] = useState(0);
  const [currentProgressMessage, setCurrentProgressMessage] = useState('');

  // The "Smart Manager" orchestrator
  const processAllPolicies = async (jobId: string) => {
    setIsProcessing(true);
    setCurrentProgressMessage('Starting job...');

    try {
      // 1. Get all active policies from the database
      setCurrentProgressMessage('Fetching all active policies...');
      const { data: policies, error: policiesError } = await supabase
        .from('etsy_policies').select('id, category, content').eq('is_active', true);
      if (policiesError) throw policiesError;

      await supabase.from('policy_analysis_jobs').update({ total_policies: policies.length }).eq('id', jobId);

      let totalProcessedCount = 0;
      // 2. Loop through each policy
      for (const policy of policies) {
        // Check if this policy is already processed to allow for resumability
        const { count } = await supabase.from('policy_sections').select('id', { count: 'exact', head: true }).eq('policy_id', policy.id);
        if (count && count > 3) {
            console.log(`Skipping already processed policy: ${policy.category}`);
            totalProcessedCount++;
            setProcessedPoliciesCount(totalProcessedCount);
            continue;
        }
        
        // Clean up any partial sections from a failed previous run
        await supabase.from('policy_sections').delete().eq('policy_id', policy.id);

        // 3. Extract the Table of Contents (now on the client)
        setCurrentProgressMessage(`[${policy.category}] Extracting table of contents...`);
        const sectionTitles = await extractTableOfContents(policy.content, policy.category);
        if (sectionTitles.length === 0) {
            console.warn(`No sections found for policy: ${policy.category}`);
            continue;
        }

        // 4. Loop through each section title
        for (let i = 0; i < sectionTitles.length; i++) {
          const sectionTitle = sectionTitles[i];
          setCurrentProgressMessage(`[${policy.category}] Processing section ${i + 1}/${sectionTitles.length}: ${sectionTitle}`);
          
          const sectionContent = findSectionContent(policy.content, sectionTitle);
          const contentHash = await generateHash(sectionContent);

          // 5. Call the "Dumb Worker" Edge Function with everything it needs
          const { error: workerError } = await supabase.functions.invoke('process-policies-ai', {
            body: { jobId, policyId: policy.id, sectionTitle, sectionContent, policyCategory: policy.category, contentHash, orderIndex: i + 1 }
          });

          if (workerError) {
            // Log the error but try to continue with the next section/policy
            console.error(`Failed to process section "${sectionTitle}":`, workerError);
          }
          await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
        }
        totalProcessedCount++;
        setProcessedPoliciesCount(totalProcessedCount);
      }
      
      setCurrentProgressMessage('All policies processed successfully!');
      await supabase.from('policy_analysis_jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', jobId);
      setResult({ success: true, message: 'Job completed!' });

    } catch (error) {
      console.error("A critical error occurred during orchestration:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setCurrentProgressMessage(`Error: ${errorMessage}`);
      setResult({ success: false, message: errorMessage });
      if (jobId) {
        await supabase.from('policy_analysis_jobs').update({ status: 'failed', error_message: errorMessage }).eq('id', jobId);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartJob = async () => {
    setResult(null);
    try {
      const { data: jobData, error } = await supabase.from('policy_analysis_jobs').insert({ status: 'pending' }).select().single();
      if (error) throw error;
      
      const newJobId = jobData.id;
      setCurrentJobId(newJobId);
      await processAllPolicies(newJobId);

    } catch (error) {
      console.error('Failed to create job:', error);
      setResult({ success: false, message: 'Could not start a new job.' });
    }
  };

  const handleJobComplete = () => {
    console.log("Job marked as complete by monitor.");
    setIsProcessing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Brain />Policy Parser & AI Processor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Click "Start Processing" to begin a new job. The system will fetch all policies, then process each section one-by-one using AI. This can take several minutes.</AlertDescription></Alert>
        {isProcessing && (
          <Alert>
            <AlertCircle className="h-4 w-4 animate-pulse" />
            <AlertDescription>
              {currentProgressMessage || 'Processing...'}
            </AlertDescription>
          </Alert>
        )}
        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
        {currentJobId && <JobProgressMonitor jobId={currentJobId} onJobComplete={handleJobComplete} />}
        <div className="flex justify-end">
          <Button onClick={handleStartJob} disabled={isProcessing} size="lg">
            {isProcessing ? <><StopCircle className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><Play className="h-4 w-4 mr-2" />Start Processing</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PolicyParserManager;