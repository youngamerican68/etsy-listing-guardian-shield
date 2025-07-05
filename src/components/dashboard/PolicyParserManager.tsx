import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Download, FileText, Brain, Hash, Play } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { policyParserService, PolicyParserResult } from '@/services/policyParserService';

const PolicyParserManager = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PolicyParserResult | null>(null);

  const handleParseAll = async () => {
    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 1000);

    try {
      const parseResult = await policyParserService.parseAllEtsyPolicies();
      setResult(parseResult);
      setProgress(100);
    } catch (error) {
      console.error('Error parsing policies:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        policiesProcessed: 0,
        sectionsCreated: 0,
        keywordsExtracted: 0
      });
    } finally {
      clearInterval(progressInterval);
      setIsProcessing(false);
    }
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
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing policies...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>

            {result.success && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.policiesProcessed}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Policies Processed
                  </div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {result.sectionsCreated}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Sections Created
                  </div>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.keywordsExtracted}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Keywords Extracted
                  </div>
                </div>
              </div>
            )}
          </div>
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
            disabled={isProcessing}
            size="lg"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {isProcessing ? 'Processing...' : 'Parse All Policies'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PolicyParserManager;