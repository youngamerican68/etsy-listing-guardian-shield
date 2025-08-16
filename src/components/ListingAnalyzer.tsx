import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Upload, Type, AlertTriangle, CheckCircle, XCircle, AlertCircle, FileText, Zap, Info, Image, Tag, DollarSign, Package, Edit3, Sidebar } from "lucide-react";
import { analyzeListingContent } from '../services/listingAnalyzer';
import { openRouterAnalyzer } from '../services/openRouterAnalyzer';

// Import new enhanced components
import ComplianceMeter from './ui/ComplianceMeter';
import SuggestedFix from './ui/SuggestedFix';
import SuccessIndicators from './ui/SuccessIndicators';
import InlineEditor from './ui/InlineEditor';
import FixPrioritySidebar from './ui/FixPrioritySidebar';

interface AnalysisResult {
  timestamp: string;
  listing_text: string;
  analysis_results: {
    total_issues: number;
    compliance_score: number;
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
        displayContext?: {
          before: string;
          term: string;
          after: string;
        };
      };
      // Enhanced grouping data
      occurrences?: any[];
      occurrenceCount?: number;
      groupId?: string;
      isGrouped?: boolean;
    }>;
    summary_recommendations: Array<{
      priority: string;
      message: string;
      action: string;
    }>;
    section_health?: Array<{
      name: string;
      status: 'pass' | 'warning' | 'fail';
      issueCount: number;
    }>;
    ui_data?: {
      has_grouped_issues: boolean;
      total_occurrences: number;
      clean_sections: any[];
      problem_sections: any[];
    };
  };
  compliance_status: string;
}

const ListingAnalyzer: React.FC = () => {
  const [listingTitle, setListingTitle] = useState('');
  const [listingDescription, setListingDescription] = useState('');
  const [listingTags, setListingTags] = useState('');
  const [listingCategory, setListingCategory] = useState('');
  const [listingPrice, setListingPrice] = useState('');
  const [listingContent, setListingContent] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<'form' | 'upload'>('form');
  
  // Enhanced UI state
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [fixSuggestions, setFixSuggestions] = useState<Map<string, any>>(new Map());
  const [completedFixes, setCompletedFixes] = useState<Set<string>>(new Set());
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState<Set<string>>(new Set());

  // Clear suggestions when starting new analysis to prevent mix-ups
  useEffect(() => {
    if (isAnalyzing) {
      console.log('🧹 Clearing previous suggestions due to new analysis');
      setFixSuggestions(new Map());
      setIsGeneratingSuggestions(new Set());
      setCompletedFixes(new Set());
    }
  }, [isAnalyzing]);

  // Enhanced handler functions
  const handleApplyFix = useCallback(async (originalTerm: string, replacement: string) => {
    // Apply fix to form fields
    if (listingTitle.toLowerCase().includes(originalTerm.toLowerCase())) {
      setListingTitle(prev => prev.replace(new RegExp(originalTerm, 'gi'), replacement));
    }
    if (listingDescription.toLowerCase().includes(originalTerm.toLowerCase())) {
      setListingDescription(prev => prev.replace(new RegExp(originalTerm, 'gi'), replacement));
    }
    if (listingTags.toLowerCase().includes(originalTerm.toLowerCase())) {
      setListingTags(prev => prev.replace(new RegExp(originalTerm, 'gi'), replacement));
    }
    
    // Mark as completed
    setCompletedFixes(prev => new Set([...prev, originalTerm]));
    
    // Re-analyze after a short delay
    setTimeout(() => {
      handleAnalyze();
    }, 1000);
  }, [listingTitle, listingDescription, listingTags]);

  const handleMarkFalsePositive = useCallback((term: string, reason: string) => {
    console.log(`Marked "${term}" as false positive: ${reason}`);
    setCompletedFixes(prev => new Set([...prev, term]));
  }, []);

  const handleLearnMore = useCallback((policySection: string) => {
    // Open policy section in new tab
    window.open(`https://help.etsy.com/hc/en-us/search?query=${encodeURIComponent(policySection)}`, '_blank');
  }, []);

  const handleGenerateFixSuggestion = useCallback(async (issue: any) => {
    const issueKey = issue.term.toLowerCase().trim();
    const analysisTimestamp = analysisResult?.timestamp || '';
    const uniqueKey = `${issueKey}_${analysisTimestamp}`;
    
    // Enhanced deduplication check with more detailed logging
    if (fixSuggestions.has(issueKey)) {
      console.log(`🔄 Fix suggestion already exists for: "${issueKey}"`);
      return;
    }
    
    if (isGeneratingSuggestions.has(issueKey)) {
      console.log(`⏳ Fix suggestion already generating for: "${issueKey}"`);
      return;
    }

    console.log(`🚀 Generating fix suggestion for: "${issueKey}" (analysis: ${analysisTimestamp})`);
    setIsGeneratingSuggestions(prev => new Set([...prev, issueKey]));

    try {
      const suggestion = await openRouterAnalyzer.generateFixSuggestions(
        issue.term,
        issue.found_in?.context || '',
        issue.category
      );
      
      // Add metadata to track which analysis this suggestion belongs to
      const enhancedSuggestion = {
        ...suggestion,
        generatedAt: new Date().toISOString(),
        forAnalysis: analysisTimestamp,
        originalTerm: issue.term
      };
      
      console.log(`✅ Generated suggestion for: "${issueKey}"`, enhancedSuggestion);
      setFixSuggestions(prev => new Map([...prev, [issueKey, enhancedSuggestion]]));
    } catch (error) {
      console.error(`❌ Failed to generate fix suggestion for "${issueKey}":`, error);
    } finally {
      setIsGeneratingSuggestions(prev => {
        const newSet = new Set([...prev]);
        newSet.delete(issueKey);
        console.log(`✨ Completed suggestion generation for: "${issueKey}"`);
        return newSet;
      });
    }
  }, [fixSuggestions, isGeneratingSuggestions, analysisResult?.timestamp]);

  const handleInlineEditorSave = useCallback((content: any) => {
    setListingTitle(content.title);
    setListingDescription(content.description);
    setListingTags(content.tags);
    setListingCategory(content.category);
    setListingPrice(content.price);
    setShowInlineEditor(false);
  }, []);

  const handleExportFixList = useCallback(() => {
    if (!analysisResult) return;
    
    const fixList = analysisResult.analysis_results.flagged_issues.map((issue, index) => ({
      priority: index + 1,
      term: issue.term,
      category: issue.category,
      risk: issue.risk_level,
      description: issue.description,
      completed: completedFixes.has(issue.term) ? 'Yes' : 'No'
    }));

    const csvContent = [
      'Priority,Term,Category,Risk Level,Description,Completed',
      ...fixList.map(item => 
        `${item.priority},"${item.term}","${item.category}","${item.risk}","${item.description}","${item.completed}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'etsy-fix-list.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }, [analysisResult, completedFixes]);

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
    let contentToAnalyze = '';
    
    if (inputMethod === 'form') {
      if (!listingTitle.trim() && !listingDescription.trim()) {
        setError('Please fill in at least the title or description');
        return;
      }
      
      // Combine form fields into a single content string
      contentToAnalyze = [
        listingTitle && `Title: ${listingTitle}`,
        listingDescription && `Description: ${listingDescription}`,
        listingTags && `Tags: ${listingTags}`,
        listingCategory && `Category: ${listingCategory}`,
        listingPrice && `Price: ${listingPrice}`
      ].filter(Boolean).join('\n\n');
    } else {
      if (!listingContent.trim()) {
        setError('Please upload your listing content');
        return;
      }
      contentToAnalyze = listingContent;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeListingContent(contentToAnalyze);
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Clear analysis
  const handleClear = () => {
    setListingTitle('');
    setListingDescription('');
    setListingTags('');
    setListingCategory('');
    setListingPrice('');
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
      <Card className="border-t-4 border-t-orange-500">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <FileText className="h-5 w-5" />
            Etsy Listing Guardian Shield
          </CardTitle>
          <p className="text-sm text-orange-700">
            Analyze your Etsy listing for policy compliance and risk assessment
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as 'form' | 'upload')}>
            <TabsList className="grid w-full grid-cols-2 bg-orange-50">
              <TabsTrigger value="form" className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Type className="h-4 w-4" />
                Create Listing
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                <Upload className="h-4 w-4" />
                Upload File
              </TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="space-y-6 mt-6">
              {/* Photos Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Photos</h3>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors bg-gray-50">
                  <Image className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">
                    Add up to 10 photos to showcase your item
                  </p>
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium mb-1">
                      💡 Photo Analysis Coming Soon
                    </p>
                    <p className="text-xs text-blue-600">
                      Currently analyzing text only. Image analysis for trademark logos, copyrighted characters, and policy violations will be added in a future update.
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Add Photos
                  </Button>
                </div>
              </div>

              <Separator />

              {/* About This Listing Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">About This Listing</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={listingTitle}
                      onChange={(e) => setListingTitle(e.target.value)}
                      placeholder="Enter a descriptive title for your listing (up to 140 characters)"
                      className="mt-1"
                      maxLength={140}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {listingTitle.length}/140 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={listingDescription}
                      onChange={(e) => setListingDescription(e.target.value)}
                      placeholder="Describe your item in detail. Include materials, dimensions, care instructions, and any other important information buyers should know."
                      className="mt-1 min-h-[120px]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags" className="text-sm font-medium text-gray-700">
                      Tags
                    </Label>
                    <Input
                      id="tags"
                      value={listingTags}
                      onChange={(e) => setListingTags(e.target.value)}
                      placeholder="Add relevant tags separated by commas (e.g., handmade, vintage, gift)"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Help buyers find your item with relevant search terms
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Inventory & Pricing Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Inventory & Pricing</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                      Price <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={listingPrice}
                        onChange={(e) => setListingPrice(e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                      Category
                    </Label>
                    <Input
                      id="category"
                      value={listingCategory}
                      onChange={(e) => setListingCategory(e.target.value)}
                      placeholder="Select or type category"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4 mt-6">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-orange-400 transition-colors"
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

          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
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

      {/* Enhanced Analysis Results */}
      {analysisResult && (
        <div className={`space-y-6 ${showSidebar ? 'lg:grid lg:grid-cols-4 lg:gap-6' : ''}`}>
          <div className={`space-y-6 ${showSidebar ? 'lg:col-span-3' : ''}`}>
            
            {/* Compliance Meter */}
            <ComplianceMeter
              overallStatus={analysisResult.analysis_results.total_issues === 0 ? 'pass' : 'fail'}
              sectionBreakdown={analysisResult.analysis_results.section_health || []}
              totalIssues={analysisResult.analysis_results.total_issues}
              riskAssessment={analysisResult.analysis_results.risk_assessment}
            />

            {/* Success Indicators */}
            {analysisResult.analysis_results.ui_data?.clean_sections && 
             analysisResult.analysis_results.ui_data.clean_sections.length > 0 && (
              <SuccessIndicators
                cleanSections={analysisResult.analysis_results.ui_data.clean_sections}
                complianceScore={analysisResult.analysis_results.total_issues === 0 ? 100 : 0}
                totalIssuesFixed={completedFixes.size}
                showCelebration={analysisResult.analysis_results.total_issues === 0}
              />
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {analysisResult.analysis_results.flagged_issues.length > 0 && (
                <>
                  <Button
                    onClick={() => setShowInlineEditor(!showInlineEditor)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    {showInlineEditor ? 'Hide Editor' : 'Fix Issues Now'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowSidebar(!showSidebar)}
                  >
                    <Sidebar className="h-4 w-4 mr-2" />
                    {showSidebar ? 'Hide' : 'Show'} Priority List
                  </Button>
                </>
              )}
            </div>

            {/* Inline Editor */}
            {showInlineEditor && (
              <InlineEditor
                originalContent={{
                  title: listingTitle,
                  description: listingDescription,
                  tags: listingTags,
                  category: listingCategory,
                  price: listingPrice
                }}
                onContentChange={() => {}} // Real-time changes handled in component
                onReanalyze={async (content) => {
                  setIsAnalyzing(true);
                  try {
                    const result = await analyzeListingContent(content);
                    setAnalysisResult(result);
                  } finally {
                    setIsAnalyzing(false);
                  }
                }}
                onSave={handleInlineEditorSave}
                onCancel={() => setShowInlineEditor(false)}
                isAnalyzing={isAnalyzing}
              />
            )}

            {/* Enhanced Flagged Issues */}
            {analysisResult.analysis_results.flagged_issues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>Issues to Fix ({analysisResult.analysis_results.flagged_issues.length})</span>
                    {analysisResult.analysis_results.ui_data?.has_grouped_issues && (
                      <Badge variant="outline" className="text-xs">
                        {analysisResult.analysis_results.ui_data.total_occurrences} total occurrences
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysisResult.analysis_results.flagged_issues.map((issue, index) => {
                    const issueKey = issue.term.toLowerCase().trim();
                    
                    return (
                      <SuggestedFix
                        key={`${issueKey}-${index}`}
                        issue={issue}
                        suggestedFix={fixSuggestions.get(issueKey)}
                        onApplyFix={handleApplyFix}
                        onMarkFalsePositive={handleMarkFalsePositive}
                        onLearnMore={handleLearnMore}
                        isLoading={isGeneratingSuggestions.has(issueKey)}
                        onRequestSuggestion={() => handleGenerateFixSuggestion(issue)}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
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
                
                {/* Analysis Metadata */}
                <div className="text-xs text-gray-500 border-t pt-4 mt-4">
                  <p>Analysis completed at: {new Date(analysisResult.timestamp).toLocaleString()}</p>
                  <p>Status: {analysisResult.analysis_results.total_issues === 0 ? 'COMPLIANT' : 'NEEDS FIXES'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Priority Sidebar */}
          {showSidebar && (
            <div className="lg:col-span-1">
              <FixPrioritySidebar
                issues={analysisResult.analysis_results.flagged_issues.map((issue, index) => {
                  const issueKey = issue.term.toLowerCase().trim();
                  return {
                    id: issue.term,
                    term: issue.term,
                    category: issue.category,
                    risk_level: issue.risk_level,
                    estimatedFixTime: fixSuggestions.get(issueKey)?.estimatedFixTime || '2 min',
                    priority: index + 1,
                    isCompleted: completedFixes.has(issue.term)
                  };
                })}
                onIssueComplete={(issueId, completed) => {
                  if (completed) {
                    setCompletedFixes(prev => new Set([...prev, issueId]));
                  } else {
                    setCompletedFixes(prev => {
                      const newSet = new Set([...prev]);
                      newSet.delete(issueId);
                      return newSet;
                    });
                  }
                }}
                onExportFixList={handleExportFixList}
                className="sticky top-6"
              />
            </div>
          )}
        </div>
      )}
      </div>
    </TooltipProvider>
  );
};

export default ListingAnalyzer;