// src/components/dashboard/PolicyParserManager.tsx
// COMPLETE AND CORRECTED FILE

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, FileText, Brain, Hash, Play, StopCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { policyParserService } from '@/services/policyParserService';
import { StartJobResult, policyJobService } from '@/services/policyJobService';
import { supabase } from '@/integrations/supabase/client';
import JobProgressMonitor from '@/components/dashboard/JobProgressMonitor';

const PolicyParserManager = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [result, setResult] = useState<StartJobResult | null>(null);
  const [hasActiveJob, setHasActiveJob] = useState(false);
  const [processedPoliciesCount, setProcessedPoliciesCount] = useState(0);
  const [currentPolicyCategory, setCurrentPolicyCategory] = useState<string>('');

  useEffect(() => {
    const checkForActiveJob = async () => {
      try {
        const latestJob = await policyJobService.getLatestJob();
        if (latestJob && (latestJob.status === 'running' || latestJob.status === 'pending')) {
          setCurrentJobId(latestJob.id);
          setIsProcessing(true); // Assume it's processing if it's running
          setHasActiveJob(true);
        }
      } catch (error) {
        console.error('Error checking for active jobs:', error);
      }
    };

    checkForActiveJob();
  }, []);

  // The orchestrator function is now correctly defined INSIDE the component,
  // so it has access to useState hooks (e.g., setResult, setIsProcessing).
  const processAllPolicies = async (jobId: string) => {
    if (!jobId) {
      console.error("Job ID is required to start processing.");
      setResult({ success: false, message: 'Job ID is required.' });
      return;
    }

    setIsProcessing(true);
    setHasActiveJob(true);
    setProcessedPoliciesCount(0);
    setCurrentPolicyCategory('');

    let isJobComplete = false;
    let processedCount = 0;

    // This is the ONLY loop needed.
    while (!isJobComplete) {
      try {
        // STEP 1: FIND the next policy to work on.
        setCurrentPolicyCategory('Finding next policy...');
        console.log("Orchestrator: Finding next policy...");

        const findResponse = await supabase.functions.invoke('process-policies-ai', {
          body: { jobId }
        });

        if (findResponse.error) throw new Error(findResponse.error.message);
        
        const findResult = findResponse.data;

        if (findResult.completed) {
          isJobComplete = true;
          console.log("Orchestrator: All policies processed!");
          setResult({ success: true, message: 'All policies processed successfully!' });
          break; // Exit the loop
        }

        if (findResult.nextPolicyId) {
          // STEP 2: PROCESS the entire policy found in Step 1.
          console.log(`Orchestrator: Found policy ${findResult.policyCategory}. Telling server to process it.`);
          setCurrentPolicyCategory(findResult.policyCategory);

          const processResponse = await supabase.functions.invoke('process-policies-ai', {
            body: {
              jobId,
              policyId: findResult.nextPolicyId
            }
          });

          if (processResponse.error) throw new Error(processResponse.error.message);

          console.log(`Orchestrator: Server finished processing ${findResult.policyCategory}.`);
          processedCount++;
          setProcessedPoliciesCount(processedCount);

        } else {
          console.error("Orchestrator: Finder did not return a next policy or completion flag. Stopping.");
          isJobComplete = true;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error("Orchestrator: A critical error occurred.", error);
        setResult({ success: false, message: error instanceof Error ? error.message : 'An unknown error stopped the process.' });
        isJobComplete = true; // Stop the loop on any error
      }
    }

    setIsProcessing(false);
    setHasActiveJob(false);
    setCurrentPolicyCategory('');
  };

  const handleParseAll = async () => {
    setIsProcessing(true);
    setResult(null);
    setCurrentJobId(null);
    setHasActiveJob(false);

    try {
      // Create the job record first
      const parseResult = await policyParserService.parseAllEtsyPolicies();
      setResult(parseResult);
      
      if (parseResult.success && parseResult.jobId) {
        setCurrentJobId(parseResult.jobId);
        // Start the client-side orchestration
        await processAllPolicies(parseResult.jobId);
      } else {
        setIsProcessing(false); // Stop processing if job creation failed
      }
    } catch (error) {
      console.error('Error starting analysis:', error);
      setResult({ success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' });
      setIsProcessing(false);
      setHasActiveJob(false);
    }
  };

  const handleJobComplete = () => {
    setHasActiveJob(false);
    setCurrentJobId(null);
    setIsProcessing(false);
    // Optional: refresh data without a full page reload if possible
    console.log("Job completed or failed. Resetting state.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Policy Parser & AI Processor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ... your JSX for the UI remains the same ... */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 border rounded-lg"><Download className="h-8 w-8 text-blue-500" /><div><p className="font-medium">Web Scraping</p><p className="text-sm text-muted-foreground">Extract Etsy's ToS & policies</p></div></div>
          <div className="flex items-center gap-3 p-4 border rounded-lg"><FileText className="h-8 w-8 text-green-500" /><div><p className="font-medium">AI Processing</p><p className="text-sm text-muted-foreground">Categorize & summarize rules</p></div></div>
          <div className="flex items-center gap-3 p-4 border rounded-lg"><Hash className="h-8 w-8 text-purple-500" /><div><p className="font-medium">Keyword Extraction</p><p className="text-sm text-muted-foreground">Extract prohibited terms</p></div></div>
        </div>
        <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>This process will scrape Etsy's current Terms of Service and related policies, then use AI to categorize rules, generate plain English summaries, and extract prohibited keywords. This may take several minutes to complete.</AlertDescription></Alert>
        {isProcessing && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {currentPolicyCategory ? 
                `Processing policy: ${currentPolicyCategory}... (${processedPoliciesCount} completed)` : 
                'Starting autonomous analysis job...'
              }
            </AlertDescription>
          </Alert>
        )}
        {result && !result.success && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
        {currentJobId && (
          <JobProgressMonitor jobId={currentJobId} onJobComplete={handleJobComplete} />
        )}
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-sm font-medium">Target Policies</p>
            <div className="flex flex-wrap gap-1">
              {['Terms of Use', 'Prohibited Items', 'Handmade Policy', 'IP Policy', 'Fees', 'Community Guidelines'].map((policy) => (
                <Badge key={policy} variant="outline" className="text-xs">{policy}</Badge>
              ))}
            </div>
          </div>
          <Button onClick={handleParseAll} disabled={isProcessing} size="lg" className="flex items-center gap-2">
            {isProcessing ? (
              <><StopCircle className="h-4 w-4 animate-spin" />Processing...</>
            ) : (
              <><Play className="h-4 w-4" />Start Autonomous Processing</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PolicyParserManager;