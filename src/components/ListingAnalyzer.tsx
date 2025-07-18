import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, Type, AlertTriangle, CheckCircle, XCircle, AlertCircle, FileText, Zap, Info } from "lucide-react";
import { analyzeListingContent } from '../services/listingAnalyzer';

interface AnalysisResult {
  timestamp: string;
  listing_text: string;
  analysis_results: {
    total_issues: number;
    risk_assessment: {
      overall: string;
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    flagged_issues: Array<{
      type: string;
      term: string;
      category: string;
      risk_level: string;
      description: string;
      found_in?: {
        context: string;
        position: number;
      };
    }>;
    summary_recommendations: Array<{
      priority: string;
      message: string;
      action: string;
    }>;
  };
  compliance_status: string;
}

const ListingAnalyzer: React.FC = () => {
  const [listingContent, setListingContent] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<'type' | 'upload'>('type');

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    
    if (files.length > 0) {
      const file = files[0];
      
      // Only allow text files
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setListingContent(content);
          setInputMethod('upload');
        };
        reader.readAsText(file);
      } else {
        setError('Please upload a text file (.txt)');
      }
    }
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // Handle file upload via button
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setListingContent(content);
      };
      reader.readAsText(file);
    }
  };

  // Analyze listing content
  const handleAnalyze = async () => {
    if (!listingContent.trim()) {
      setError('Please enter or upload your listing content');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeListingContent(listingContent);
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Clear analysis
  const handleClear = () => {
    setListingContent('');
    setAnalysisResult(null);
    setError(null);
  };

  // Get risk level styling
  const getRiskStyling = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Get risk icon
  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Etsy Listing Guardian Shield
          </CardTitle>
          <p className="text-sm text-gray-600">
            Analyze your Etsy listing for policy compliance and risk assessment
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as 'type' | 'upload')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="type" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Type Content
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload File
              </TabsTrigger>
            </TabsList>

            <TabsContent value="type" className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter your listing content:
                </label>
                <Textarea
                  value={listingContent}
                  onChange={(e) => setListingContent(e.target.value)}
                  placeholder="Paste your listing title, description, tags, and any other content here..."
                  className="min-h-[200px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">
                  Drag and drop your listing file here
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  or click to browse for a text file
                </p>
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Choose File
                  </Button>
                </label>
              </div>
              
              {listingContent && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">
                    Uploaded content preview:
                  </label>
                  <div className="bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap">{listingContent}</pre>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !listingContent.trim()}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Analyze Listing
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                analysisResult.compliance_status === 'compliant' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {analysisResult.compliance_status === 'compliant' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {analysisResult.compliance_status === 'compliant' ? 'Compliant' : 'Needs Review'}
              </div>
              <span className="ml-2">Analysis Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Risk Assessment Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${getRiskStyling(analysisResult.analysis_results.risk_assessment.overall)} rounded-lg p-3`}>
                  {analysisResult.analysis_results.risk_assessment.overall.toUpperCase()}
                </div>
                <p className="text-sm text-gray-600 mt-1">Overall Risk</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analysisResult.analysis_results.risk_assessment.critical}</div>
                <p className="text-sm text-gray-600">Critical</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{analysisResult.analysis_results.risk_assessment.high}</div>
                <p className="text-sm text-gray-600">High</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{analysisResult.analysis_results.risk_assessment.medium}</div>
                <p className="text-sm text-gray-600">Medium</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{analysisResult.analysis_results.risk_assessment.low}</div>
                <p className="text-sm text-gray-600">Low</p>
              </div>
            </div>

            {/* Flagged Issues */}
            {analysisResult.analysis_results.flagged_issues.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Flagged Issues ({analysisResult.analysis_results.flagged_issues.length})</h3>
                <div className="space-y-3">
                  {analysisResult.analysis_results.flagged_issues.map((issue, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getRiskStyling(issue.risk_level)}>
                              {getRiskIcon(issue.risk_level)}
                              {issue.risk_level.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{issue.category}</Badge>
                          </div>
                          <p className="font-medium text-red-600 mb-1">
                            Flagged term: "{issue.term}"
                          </p>
                          {issue.description && (
                            <p className="text-sm text-gray-700 mb-2">
                              {issue.description}
                            </p>
                          )}
                          {issue.found_in && (
                            <div className="bg-white p-3 rounded border text-sm border-l-4 border-l-orange-200">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <strong className="text-gray-700">Found in context:</strong>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-1 cursor-help text-blue-600 hover:text-blue-800">
                                        <Info className="h-4 w-4" />
                                        <span className="text-xs">Hover for full sentence</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-lg p-3">
                                      <div className="space-y-2">
                                        <p className="font-medium text-gray-900">Complete sentence:</p>
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                          "{issue.found_in.fullContext || issue.found_in.context}"
                                        </p>
                                        <p className="text-xs text-gray-500 italic">
                                          The flagged term "{issue.term}" appears in this context
                                        </p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="bg-gray-50 p-2 rounded font-mono text-xs">
                                  "...{issue.found_in.context}..."
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Recommendations</h3>
              <div className="space-y-3">
                {analysisResult.analysis_results.summary_recommendations.map((rec, index) => (
                  <Alert key={index} variant={rec.priority === 'success' ? 'default' : 'destructive'}>
                    <div className="flex items-start gap-2">
                      {rec.priority === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">{rec.message}</p>
                        <p className="text-sm mt-1 opacity-80">{rec.action}</p>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            </div>

            {/* Analysis Metadata */}
            <div className="text-xs text-gray-500 border-t pt-4">
              <p>Analysis completed at: {new Date(analysisResult.timestamp).toLocaleString()}</p>
              <p>Total issues found: {analysisResult.analysis_results.total_issues}</p>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </TooltipProvider>
  );
};

export default ListingAnalyzer;