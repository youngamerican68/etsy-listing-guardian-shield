import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, FileText, Brain, Hash, Play, StopCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { policyParserService } from '@/services/policyParserService';
import { StartJobResult, policyJobService } from '@/services/policyJobService';
import { supabase } from '@/integrations/supabase/client';
import JobProgressMonitor from './JobProgressMonitor';

const PolicyParserManager = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [result, setResult] = useState<StartJobResult | null>(null);
  const [hasActiveJob, setHasActiveJob] = useState(false);
  const [processedPoliciesCount, setProcessedPoliciesCount] = useState(0);
  const [currentPolicyCategory, setCurrentPolicyCategory] = useState<string>('');

  // Check for existing active jobs on component mount
  useEffect(() => {
    const checkForActiveJob = async () => {
      try {
        const latestJob = await policyJobService.getLatestJob();
        if (latestJob && (latestJob.status === 'running' || latestJob.status === 'pending')) {
          setCurrentJobId(latestJob.id);
          setHasActiveJob(true);
        }
      } catch (error) {
        console.error('Error checking for active jobs:', error);
      }
    };

    checkForActiveJob();
  }, []);

  // Client-side orchestrator function
  const processAllPolicies = async (jobId: string) => {
    if (!jobId) {
      console.error("A Job ID is required to start processing.");
      setResult({
        success: false,
        message: 'A Job ID is required to start processing.'
      });
      return;
    }

    let isJobComplete = false;
    let processedCount = 0;

    setIsProcessing(true);
    setHasActiveJob(true);
    setProcessedPoliciesCount(0);
    setCurrentPolicyCategory('');

    while (!isJobComplete) {
      try {
        // Get auth token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No valid session found');
        }

        // STEP 1: Call the function in "Finder" mode to get the next policy
        console.log("Finding the next policy to process...");
        const findResponse = await supabase.functions.invoke('process-policies-ai', {
          body: { jobId }
        });
        
        if (findResponse.error) {
          throw new Error(findResponse.error.message || 'Failed to find the next policy.');
        }
        
        const findResult = findResponse.data;
        
        if (findResult.completed) {
          isJobComplete = true;
          console.log("All policies have been processed successfully!");
          setResult({
            success: true,
            message: `Successfully processed ${processedCount} policies!`
          });
          break;
        }
        
        if (findResult.nextPolicyId) {
          // STEP 2: Call the function in "Worker" mode to process the specific policy
          console.log(`Found policy: ${findResult.policyCategory} (${findResult.nextPolicyId}). Starting processing...`);
          setCurrentPolicyCategory(findResult.policyCategory);

          const processResponse = await supabase.functions.invoke('process-policies-ai', {
            body: { 
              jobId, 
              policyId: findResult.nextPolicyId 
            }
          });
          
          if (processResponse.error) {
            throw new Error(processResponse.error.message || `Failed to process policy ${findResult.policyCategory}.`);
          }

          processedCount++;
          setProcessedPoliciesCount(processedCount);
          console.log(`Successfully processed ${findResult.policyCategory}. Result:`, processResponse.data.message);
        } else {
          console.error("Finder did not return a next policy or a completion flag. Stopping.");
          break;
        }
        
        // Small delay to be respectful to the APIs
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error("An error occurred during the orchestration:", error);
        setResult({
          success: false,
          message: error instanceof Error ? error.message : 'An error occurred during processing.'
        });
        isJobComplete = true; // Stop the loop on error
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
      // First create the job
      const parseResult = await policyParserService.parseAllEtsyPolicies();
      setResult(parseResult);
      
      if (parseResult.success && parseResult.jobId) {
        setCurrentJobId(parseResult.jobId);
        // Start the client-side orchestration
        await processAllPolicies(parseResult.jobId);
      }
    } catch (error) {
      console.error('Error starting analysis:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      setIsProcessing(false);
      setHasActiveJob(false);
    }
  };

  const handleJobComplete = () => {
    setHasActiveJob(false);
    setCurrentJobId(null);
    // Trigger page refresh or data refetch when job completes
    window.location.reload();
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <Download className="h-8 w-8 text-blue-500" />
            <div>
              <p className="font-medium">Web Scraping</p>
              <p className="text-sm text-muted-foreground">
                Extract Etsy's ToS & policies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <FileText className="h-8 w-8 text-green-500" />
            <div>
              <p className="font-medium">AI Processing</p>
              <p className="text-sm text-muted-foreground">
                Categorize & summarize rules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <Hash className="h-8 w-8 text-purple-500" />
            <div>
              <p className="font-medium">Keyword Extraction</p>
              <p className="text-sm text-muted-foreground">
                Extract prohibited terms
              </p>
            </div>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This process will scrape Etsy's current Terms of Service and related policies, 
            then use AI to categorize rules, generate plain English summaries, and extract 
            prohibited keywords. This may take several minutes to complete.
          </AlertDescription>
        </Alert>

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

        {hasActiveJob && !isProcessing && (
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              Autonomous processing active. The system will continuously work until all policies are processed.
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
                <Badge key={policy} variant="outline" className="text-xs">
                  {policy}
                </Badge>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleParseAll}
            disabled={isProcessing || hasActiveJob}
            size="lg"
            className="flex items-center gap-2"
          >
            {hasActiveJob ? (
              <>
                <StopCircle className="h-4 w-4" />
                Processing Active
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                {isProcessing ? 'Starting...' : 'Start Autonomous Processing'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PolicyParserManager;