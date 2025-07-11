import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, FileText, Brain, Hash, Play } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { policyParserService } from '@/services/policyParserService';
import { StartJobResult, policyJobService } from '@/services/policyJobService';
import JobProgressMonitor from './JobProgressMonitor';

const PolicyParserManager = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [result, setResult] = useState<StartJobResult | null>(null);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);

  const handleParseAll = async () => {
    setIsProcessing(true);
    setResult(null);
    setCurrentJobId(null);
    setAutoRetryCount(0);
    setIsAutoRetrying(false);

    try {
      const parseResult = await policyParserService.parseAllEtsyPolicies();
      setResult(parseResult);
      
      if (parseResult.success && parseResult.jobId) {
        setCurrentJobId(parseResult.jobId);
        // Start auto-retry process
        startAutoRetryProcess(parseResult.jobId);
      }
    } catch (error) {
      console.error('Error starting analysis:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startAutoRetryProcess = async (jobId: string) => {
    const maxAttempts = 20; // Adjust based on typical completion time
    const retryInterval = 5 * 60 * 1000; // 5 minutes between retries
    
    setIsAutoRetrying(true);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      setAutoRetryCount(attempt);
      
      try {
        // Check job status first
        const jobStatus = await policyJobService.getJobStatus(jobId);
        
        if (jobStatus?.status === 'completed') {
          console.log('Job completed successfully');
          setIsAutoRetrying(false);
          handleJobComplete();
          return;
        }
        
        if (jobStatus?.status === 'failed' || !jobStatus) {
          console.log(`Job failed or not found, triggering new job (attempt ${attempt})`);
          
          // Trigger a new processing job
          const parseResult = await policyParserService.parseAllEtsyPolicies();
          
          if (parseResult.success && parseResult.jobId) {
            setCurrentJobId(parseResult.jobId);
            // Continue monitoring the new job
            await new Promise(resolve => setTimeout(resolve, retryInterval));
            continue;
          }
        } else if (jobStatus?.status === 'running') {
          console.log(`Job still running (attempt ${attempt}), waiting...`);
          await new Promise(resolve => setTimeout(resolve, retryInterval));
          continue;
        }
        
      } catch (error) {
        console.error(`Auto-retry attempt ${attempt} failed:`, error);
        if (attempt === maxAttempts) {
          setResult({
            success: false,
            message: `Auto-retry failed after ${maxAttempts} attempts`
          });
          break;
        }
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
    
    setIsAutoRetrying(false);
  };

  const handleJobComplete = () => {
    setIsAutoRetrying(false);
    setAutoRetryCount(0);
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
            <AlertDescription>Starting analysis job...</AlertDescription>
          </Alert>
        )}

        {isAutoRetrying && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Auto-retry mode active (attempt {autoRetryCount}/20). 
              Processing will continue automatically until completion. 
              Next retry in 5 minutes if job fails.
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
            disabled={isProcessing || isAutoRetrying}
            size="lg"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isProcessing ? 'Starting...' : isAutoRetrying ? 'Auto-Retrying...' : 'Parse All Policies'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PolicyParserManager;