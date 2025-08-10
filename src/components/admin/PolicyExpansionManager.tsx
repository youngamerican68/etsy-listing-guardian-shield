// Component to manage policy expansion - insert new detailed policies
// Add this to your admin dashboard to run the policy expansion

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2, Database, Cpu, Shield } from 'lucide-react';
import { insertNewPolicies, triggerPolicyProcessing } from '@/utils/insertNewPolicies';
import { addNewComplianceRules } from '@/utils/addNewComplianceRules';
import { checkExistingCategories } from '@/utils/checkExistingCategories';
import { updateExistingPolicies } from '@/utils/updateExistingPolicies';
import { verifyPolicyUpdates } from '@/utils/verifyPolicyUpdates';
import { checkSupabaseTables } from '@/utils/checkSupabaseTables';
import { checkSpecificSection } from '@/utils/checkSpecificSection';
import { checkUnprocessedSections } from '@/utils/checkUnprocessedSections';
import { inspectUnprocessedSections } from '@/utils/inspectUnprocessedSections';
import { checkRealProcessingStatus } from '@/utils/checkRealProcessingStatus';
import { auditPolicySections } from '@/utils/auditPolicySections';
import { findActualCategories } from '@/utils/findActualCategories';
import { mimicEdgeFunction } from '@/utils/mimicEdgeFunction';
import { checkDuplicateSections } from '@/utils/checkDuplicateSections';

const PolicyExpansionManager = () => {
  const [isInserting, setIsInserting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingRules, setIsAddingRules] = useState(false);
  const [insertResult, setInsertResult] = useState<any>(null);
  const [processResult, setProcessResult] = useState<any>(null);
  const [rulesResult, setRulesResult] = useState<any>(null);
  const [categoryCheck, setCategoryCheck] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [tableCheck, setTableCheck] = useState<any>(null);
  const [sectionCheck, setSectionCheck] = useState<any>(null);
  const [unprocessedCheck, setUnprocessedCheck] = useState<any>(null);
  const [inspectionResult, setInspectionResult] = useState<any>(null);
  const [realStatus, setRealStatus] = useState<any>(null);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [categoryResult, setCategoryResult] = useState<any>(null);
  const [edgeMimic, setEdgeMimic] = useState<any>(null);
  const [duplicateCheck, setDuplicateCheck] = useState<any>(null);

  const handleInsertPolicies = async () => {
    setIsInserting(true);
    setInsertResult(null);
    
    try {
      const result = await insertNewPolicies();
      setInsertResult(result);
      
      if (result.success && result.inserted > 0) {
        console.log('🎉 Ready to trigger AI processing...');
      }
      
    } catch (error) {
      setInsertResult({ 
        success: false, 
        error: error.message,
        message: `Unexpected error: ${error.message}`
      });
    } finally {
      setIsInserting(false);
    }
  };

  const handleTriggerProcessing = async () => {
    setIsProcessing(true);
    setProcessResult(null);
    
    try {
      const result = await triggerPolicyProcessing();
      setProcessResult(result);
    } catch (error) {
      setProcessResult({ 
        success: false, 
        error: error.message 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddComplianceRules = async () => {
    setIsAddingRules(true);
    setRulesResult(null);
    
    try {
      const result = await addNewComplianceRules();
      setRulesResult(result);
    } catch (error) {
      setRulesResult({ 
        success: false, 
        error: error.message,
        message: `Unexpected error: ${error.message}`
      });
    } finally {
      setIsAddingRules(false);
    }
  };

  const handleCheckCategories = async () => {
    try {
      const result = await checkExistingCategories();
      setCategoryCheck(result);
    } catch (error) {
      setCategoryCheck({ 
        success: false, 
        error: error.message 
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Policy Database Expansion
          </CardTitle>
          <CardDescription>
            Expand Etsy policy coverage with 5 new detailed policy categories including prohibited items subcategories, 
            handmade verification rules, intellectual property distinctions, and community guidelines.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">New Policy Categories to Add:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Prohibited Items Expanded</strong> - Hazardous materials, recalled items, weapons, adult content</li>
              <li>• <strong>Handmade Expanded</strong> - Production partners, 20-year vintage rule, creativity standards</li>
              <li>• <strong>Intellectual Property Expanded</strong> - Copyright vs trademark, fair use, character rights</li>
              <li>• <strong>Fees & Payments Expanded</strong> - Fee avoidance policy, payment processing rules</li>
              <li>• <strong>Community Conduct Expanded</strong> - Zero tolerance violations, harassment prevention</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleCheckCategories}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              Check Existing Categories
            </Button>
            
            <Button 
              onClick={async () => {
                setIsInserting(true);
                setInsertResult(null);
                try {
                  const result = await updateExistingPolicies();
                  setInsertResult(result);
                } catch (error) {
                  setInsertResult({ 
                    success: false, 
                    error: error.message,
                    message: `Unexpected error: ${error.message}`
                  });
                } finally {
                  setIsInserting(false);
                }
              }}
              disabled={isInserting}
              className="flex items-center gap-2"
            >
              {isInserting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {isInserting ? 'Updating Policies...' : 'Update Existing Policies'}
            </Button>
            
            {insertResult?.success && (insertResult.inserted > 0 || insertResult.updated > 0) && (
              <Button 
                onClick={handleTriggerProcessing}
                disabled={isProcessing}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Cpu className="h-4 w-4" />
                )}
                {isProcessing ? 'Processing...' : 'Trigger AI Processing'}
              </Button>
            )}
            
            <Button 
              onClick={handleAddComplianceRules}
              disabled={isAddingRules}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {isAddingRules ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              {isAddingRules ? 'Adding Rules...' : 'Add New Compliance Rules'}
            </Button>
            
            <Button 
              onClick={async () => {
                try {
                  const result = await verifyPolicyUpdates();
                  setVerificationResult(result);
                } catch (error) {
                  setVerificationResult({ 
                    success: false, 
                    error: error.message 
                  });
                }
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              Verify Policy Content
            </Button>
            
            <Button 
              onClick={async () => {
                try {
                  const result = await checkSupabaseTables();
                  setTableCheck(result);
                } catch (error) {
                  setTableCheck({ 
                    success: false, 
                    error: error.message 
                  });
                }
              }}
              variant="outline"
              size="sm" 
              className="flex items-center gap-2"
            >
              Check Supabase Tables
            </Button>
            
            <Button 
              onClick={async () => {
                try {
                  const result = await checkSpecificSection("hate groups");
                  setSectionCheck(result);
                } catch (error) {
                  setSectionCheck({ 
                    success: false, 
                    error: error.message 
                  });
                }
              }}
              variant="outline"
              size="sm" 
              className="flex items-center gap-2"
            >
              Check Hate Speech Section
            </Button>
            
            <Button 
              onClick={async () => {
                try {
                  const result = await checkRealProcessingStatus();
                  setRealStatus(result);
                } catch (error) {
                  setRealStatus({ 
                    success: false, 
                    error: error.message 
                  });
                }
              }}
              variant="outline"
              size="sm" 
              className="flex items-center gap-2 bg-blue-50 border-blue-300 text-blue-800 font-semibold"
            >
              🎯 REAL Processing Status
            </Button>
            
            <Button 
              onClick={async () => {
                try {
                  const result = await checkDuplicateSections();
                  setDuplicateCheck(result);
                } catch (error) {
                  setDuplicateCheck({ 
                    success: false, 
                    error: error.message 
                  });
                }
              }}
              variant="outline"
              size="sm" 
              className="flex items-center gap-2 bg-orange-50 border-orange-300 text-orange-800 font-bold"
            >
              🔍 CHECK DUPLICATES
            </Button>
          </div>

          {insertResult && (
            <Alert className={insertResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {insertResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={insertResult.success ? "text-green-800" : "text-red-800"}>
                <strong>{insertResult.success ? 'Success!' : 'Error:'}</strong> {insertResult.message}
                {insertResult.inserted > 0 && (
                  <div className="mt-2">
                    <strong>Inserted {insertResult.inserted} new policies:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {insertResult.policies?.map((policy: any) => (
                        <li key={policy.id} className="text-sm">
                          {policy.category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {insertResult.updated > 0 && (
                  <div className="mt-2">
                    <strong>Updated {insertResult.updated} existing policies with expanded content:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {insertResult.updates?.map((update: any) => (
                        <li key={update.category} className="text-sm">
                          {update.category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} - Enhanced
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {processResult && (
            <Alert className={processResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {processResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={processResult.success ? "text-green-800" : "text-red-800"}>
                {processResult.success ? (
                  <div>
                    <strong>AI Processing Triggered!</strong> The system will now automatically process new policy sections.
                    <div className="text-sm mt-1">Check the Policy Processing Monitor for progress updates.</div>
                  </div>
                ) : (
                  <div>
                    <strong>Processing Failed:</strong> {processResult.error}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {categoryCheck && (
            <Alert className={categoryCheck.success ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}>
              {categoryCheck.success ? (
                <CheckCircle className="h-4 w-4 text-blue-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={categoryCheck.success ? "text-blue-800" : "text-red-800"}>
                <strong>Existing Categories:</strong>
                {categoryCheck.success && categoryCheck.data && (
                  <div className="mt-2">
                    <ul className="list-disc list-inside">
                      {categoryCheck.data.map((policy: any) => (
                        <li key={policy.category} className="text-sm">
                          {policy.category} - {policy.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {tableCheck && (
            <Alert className={tableCheck.success ? "border-indigo-200 bg-indigo-50" : "border-red-200 bg-red-50"}>
              {tableCheck.success ? (
                <CheckCircle className="h-4 w-4 text-indigo-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={tableCheck.success ? "text-indigo-800" : "text-red-800"}>
                <strong>Supabase Tables Status:</strong> {tableCheck.message}
                {tableCheck.results && (
                  <div className="mt-2 space-y-2">
                    <div>
                      <strong>Compliance Rules ({tableCheck.results.complianceRules.total}):</strong>
                      <ul className="text-xs ml-4">
                        {Object.entries(tableCheck.results.complianceRules.byRisk).map(([level, count]: [string, any]) => (
                          <li key={level}>{level}: {count} rules</li>
                        ))}
                      </ul>
                      {tableCheck.results.complianceRules.enhancedCount > 0 && (
                        <p className="text-xs mt-1">✅ {tableCheck.results.complianceRules.enhancedCount} enhanced rules detected</p>
                      )}
                    </div>
                    <div>
                      <strong>Policy Sections ({tableCheck.results.policySections.total}):</strong>
                      <p className="text-xs">AI Processed: {tableCheck.results.policySections.aiProcessed}, Pending: {tableCheck.results.policySections.needingProcessing}</p>
                      {tableCheck.results.policySections.expandedTotal > 0 && (
                        <p className="text-xs text-blue-600">
                          🎯 Expanded sections: {tableCheck.results.policySections.expandedAiProcessed}/{tableCheck.results.policySections.expandedTotal} processed 
                          ({tableCheck.results.policySections.expandedNeedingProcessing} remaining)
                        </p>
                      )}
                    </div>
                    <div>
                      <strong>Enhanced Policies:</strong> {tableCheck.results.etsyPolicies.enhanced}/{tableCheck.results.etsyPolicies.total}
                      {tableCheck.results.etsyPolicies.enhancedCategories.length > 0 && (
                        <span className="text-xs"> ({tableCheck.results.etsyPolicies.enhancedCategories.join(', ')})</span>
                      )}
                    </div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {verificationResult && (
            <Alert className={verificationResult.success ? "border-purple-200 bg-purple-50" : "border-red-200 bg-red-50"}>
              {verificationResult.success ? (
                <CheckCircle className="h-4 w-4 text-purple-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={verificationResult.success ? "text-purple-800" : "text-red-800"}>
                <strong>Verification Results:</strong> {verificationResult.message}
                {verificationResult.verification && (
                  <div className="mt-2">
                    <ul className="list-disc list-inside text-sm">
                      {verificationResult.verification.enhancedContent?.map((policy: any) => (
                        <li key={policy.category}>
                          <strong>{policy.category}:</strong> {policy.keyIndicators.join(', ')} 
                          ({policy.contentLength} chars)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {rulesResult && (
            <Alert className={rulesResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {rulesResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={rulesResult.success ? "text-green-800" : "text-red-800"}>
                <strong>{rulesResult.success ? 'Success!' : 'Error:'}</strong> {rulesResult.message}
                {rulesResult.riskBreakdown && (
                  <div className="mt-2">
                    <strong>Added {rulesResult.added} new rules by risk level:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {Object.entries(rulesResult.riskBreakdown).map(([level, count]: [string, any]) => (
                        <li key={level} className="text-sm">
                          {level}: {count} rules
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {sectionCheck && (
            <Alert className={sectionCheck.success ? "border-teal-200 bg-teal-50" : "border-red-200 bg-red-50"}>
              {sectionCheck.success ? (
                <CheckCircle className="h-4 w-4 text-teal-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={sectionCheck.success ? "text-teal-800" : "text-red-800"}>
                <strong>Section Verification:</strong> {sectionCheck.message}
                {sectionCheck.recentSection && (
                  <div className="mt-2 space-y-1">
                    <div><strong>Title:</strong> {sectionCheck.recentSection.section_title}</div>
                    <div><strong>Category:</strong> {sectionCheck.recentSection.category}</div>
                    <div><strong>Risk Level:</strong> {sectionCheck.recentSection.risk_level}</div>
                    <div><strong>Created:</strong> {new Date(sectionCheck.recentSection.created_at).toLocaleString()}</div>
                    {sectionCheck.recentSection.plain_english_summary && (
                      <div><strong>Summary:</strong> {sectionCheck.recentSection.plain_english_summary.substring(0, 100)}...</div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {unprocessedCheck && (
            <Alert className={unprocessedCheck.unprocessed > 0 ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50"}>
              {unprocessedCheck.unprocessed === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              )}
              <AlertDescription className={unprocessedCheck.unprocessed === 0 ? "text-green-800" : "text-yellow-800"}>
                <strong>📋 Processing Status:</strong> {unprocessedCheck.message}
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Progress:</strong> {unprocessedCheck.processed}/{unprocessedCheck.totalExpanded} sections processed
                  </div>
                  <div>
                    <strong>Remaining:</strong> {unprocessedCheck.unprocessed} sections
                  </div>
                  {unprocessedCheck.recentlyProcessed > 0 && (
                    <div className="col-span-2">
                      <strong>✅ Recently processed:</strong> {unprocessedCheck.recentlyProcessed} sections in last 2 hours
                    </div>
                  )}
                </div>
                {unprocessedCheck.nextToProcess && unprocessedCheck.nextToProcess.length > 0 && (
                  <div className="mt-3">
                    <strong>🎯 Next sections to process:</strong>
                    <ul className="list-disc list-inside mt-1 text-sm">
                      {unprocessedCheck.nextToProcess.slice(0, 3).map((section: any, i: number) => (
                        <li key={i}>
                          <strong>{section.category}:</strong> {section.title.substring(0, 60)}...
                        </li>
                      ))}
                    </ul>
                    {unprocessedCheck.nextToProcess.length > 3 && (
                      <p className="text-xs mt-1">...and {unprocessedCheck.nextToProcess.length - 3} more</p>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {inspectionResult && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>🔍 Debug Results:</strong> {inspectionResult.message}
                {inspectionResult.unprocessedDetails && inspectionResult.unprocessedDetails.length > 0 && (
                  <div className="mt-3 space-y-3">
                    <strong>Problematic Sections:</strong>
                    {inspectionResult.unprocessedDetails.slice(0, 3).map((section: any, i: number) => (
                      <div key={i} className="bg-orange-100 p-3 rounded text-xs">
                        <div><strong>Title:</strong> {section.title}</div>
                        <div><strong>Category:</strong> {section.category}</div>
                        <div><strong>Summary Length:</strong> {section.summaryLength} chars</div>
                        <div><strong>Current Summary:</strong> "{section.summary}"</div>
                        <div><strong>Created:</strong> {new Date(section.created).toLocaleString()}</div>
                        <div><strong>Content Preview:</strong> "{section.content}..."</div>
                      </div>
                    ))}
                    {inspectionResult.unprocessedDetails.length > 3 && (
                      <p className="text-xs">...and {inspectionResult.unprocessedDetails.length - 3} more problematic sections</p>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {realStatus && (
            <Alert className={realStatus.unprocessedTotal === 0 ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}>
              {realStatus.unprocessedTotal === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-blue-600" />
              )}
              <AlertDescription className={realStatus.unprocessedTotal === 0 ? "text-green-800" : "text-blue-800"}>
                <strong>🎯 REAL Processing Status:</strong> {realStatus.message}
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm font-medium">
                  <div className="bg-blue-100 p-2 rounded">
                    <strong>Total Sections:</strong> {realStatus.totalSections}
                  </div>
                  <div className={realStatus.unprocessedTotal === 0 ? "bg-green-100 p-2 rounded" : "bg-yellow-100 p-2 rounded"}>
                    <strong>Unprocessed:</strong> {realStatus.unprocessedTotal}
                  </div>
                  <div className="bg-purple-100 p-2 rounded">
                    <strong>Expanded Categories:</strong> {realStatus.expandedTotal}
                  </div>
                  <div className={realStatus.expandedUnprocessed === 0 ? "bg-green-100 p-2 rounded" : "bg-orange-100 p-2 rounded"}>
                    <strong>Expanded Unprocessed:</strong> {realStatus.expandedUnprocessed}
                  </div>
                </div>
                {realStatus.veryRecentProcessed > 0 && (
                  <div className="mt-2 p-2 bg-green-100 rounded">
                    <strong>✅ Very Recently Processed (30min):</strong> {realStatus.veryRecentProcessed} sections
                  </div>
                )}
                {realStatus.nextToProcess && realStatus.nextToProcess.length > 0 && (
                  <div className="mt-3">
                    <strong>🔄 Next {Math.min(3, realStatus.nextToProcess.length)} sections Edge Function will process:</strong>
                    <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                      {realStatus.nextToProcess.slice(0, 3).map((section: any, i: number) => (
                        <li key={i} className="bg-yellow-50 p-2 rounded">
                          <strong>{section.category}:</strong> {section.title.substring(0, 50)}...
                          <div className="text-xs text-gray-600">
                            Status: {section.summaryStatus} ({section.summaryLength} chars)
                          </div>
                        </li>
                      ))}
                    </ul>
                    {realStatus.nextToProcess.length > 3 && (
                      <p className="text-xs mt-1 text-gray-600">...and {realStatus.nextToProcess.length - 3} more sections</p>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {auditResult && (
            <Alert className={auditResult.expandedTotals?.unprocessed === 0 ? "border-green-200 bg-green-50" : "border-purple-200 bg-purple-50"}>
              {auditResult.expandedTotals?.unprocessed === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-purple-600" />
              )}
              <AlertDescription className={auditResult.expandedTotals?.unprocessed === 0 ? "text-green-800" : "text-purple-800"}>
                <strong>📊 DATABASE AUDIT:</strong> {auditResult.message}
                
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs font-semibold bg-purple-100 p-2 rounded">
                    <div>Total: {auditResult.expandedTotals?.total}</div>
                    <div>Processed: {auditResult.expandedTotals?.processed}</div>
                    <div>Remaining: {auditResult.expandedTotals?.unprocessed}</div>
                  </div>
                  
                  <strong className="block">Breakdown by Expanded Category:</strong>
                  {auditResult.expandedAnalysis?.map((cat: any) => (
                    <div key={cat.category} className={`p-2 rounded text-xs ${cat.unprocessed === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                      <div className="font-semibold">{cat.category.replace(/_/g, ' ').toUpperCase()}</div>
                      <div>Progress: {cat.processed}/{cat.total} sections ({cat.unprocessed} remaining)</div>
                      {cat.unprocessedTitles.length > 0 && (
                        <div className="text-gray-600 mt-1">
                          <strong>Next to process:</strong> {cat.unprocessedTitles.slice(0, 2).join(', ')}
                          {cat.unprocessedTitles.length > 2 && ` (+${cat.unprocessedTitles.length - 2} more)`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {categoryResult && (
            <Alert className="border-indigo-200 bg-indigo-50">
              <AlertCircle className="h-4 w-4 text-indigo-600" />
              <AlertDescription className="text-indigo-800">
                <strong>🔍 ACTUAL DATABASE CATEGORIES:</strong> {categoryResult.message}
                
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs font-semibold bg-indigo-100 p-2 rounded">
                    <div>Total Sections: {categoryResult.totalSections}</div>
                    <div>Processed: {categoryResult.totalProcessed}</div>
                    <div>Unprocessed: {categoryResult.totalUnprocessed}</div>
                  </div>
                  
                  <strong className="block">All Categories Found:</strong>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {categoryResult.categories?.map((cat: any) => (
                      <div key={cat.name} className={`p-2 rounded text-xs ${cat.unprocessed === 0 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                        <div className="font-semibold">{cat.name.replace(/_/g, ' ').toUpperCase()}</div>
                        <div>Progress: {cat.processed}/{cat.total} sections ({cat.unprocessed} unprocessed)</div>
                        {cat.samples && cat.samples.length > 0 && (
                          <div className="text-gray-600 mt-1">
                            <strong>Sample sections:</strong>
                            {cat.samples.slice(0, 2).map((sample: any, i: number) => (
                              <div key={i} className="text-xs">
                                • {sample.title.substring(0, 60)}... - {sample.hasProcessing ? '✅' : '❌'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {edgeMimic && (
            <Alert className={edgeMimic.totalUnprocessed === 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {edgeMimic.totalUnprocessed === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={edgeMimic.totalUnprocessed === 0 ? "text-green-800" : "text-red-800"}>
                <strong>🤖 EDGE FUNCTION LOGIC:</strong> {edgeMimic.message}
                
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-xs font-semibold bg-red-100 p-2 rounded">
                    <div>Total: {edgeMimic.totalUnprocessed}</div>
                    <div>NULL: {edgeMimic.nullSummaries}</div>
                    <div>Empty: {edgeMimic.emptySummaries}</div>
                    <div>Short: {edgeMimic.shortSummaries}</div>
                  </div>
                  
                  {edgeMimic.nextToProcess && edgeMimic.nextToProcess.length > 0 && (
                    <div>
                      <strong className="block">🎯 Next sections Edge Function will process:</strong>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {edgeMimic.nextToProcess.slice(0, 5).map((section: any, i: number) => (
                          <div key={i} className="bg-red-50 p-2 rounded text-xs border">
                            <div className="font-semibold">{section.title}</div>
                            <div className="text-gray-600">
                              Category: {section.category} | Reason: {section.reason}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Current: "{section.currentSummary.substring(0, 50)}{section.currentSummary.length > 50 ? '...' : ''}"
                            </div>
                            <div className="text-gray-400 text-xs">
                              Created: {new Date(section.created).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                      {edgeMimic.nextToProcess.length > 5 && (
                        <p className="text-xs mt-1">...and {edgeMimic.nextToProcess.length - 5} more sections</p>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {duplicateCheck && (
            <Alert className={duplicateCheck.duplicateCount === 0 ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
              {duplicateCheck.duplicateCount === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-orange-600" />
              )}
              <AlertDescription className={duplicateCheck.duplicateCount === 0 ? "text-green-800" : "text-orange-800"}>
                <strong>🔍 DUPLICATE CHECK:</strong> {duplicateCheck.message}
                
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-4 gap-2 text-xs font-semibold bg-orange-100 p-2 rounded">
                    <div>Total: {duplicateCheck.totalSections}</div>
                    <div>Processed: {duplicateCheck.processedCount}</div>
                    <div>Unprocessed: {duplicateCheck.unprocessedCount}</div>
                    <div>Duplicates: {duplicateCheck.duplicateCount}</div>
                  </div>
                  
                  {duplicateCheck.duplicateGroups && duplicateCheck.duplicateGroups.length > 0 && (
                    <div>
                      <strong className="block">🔄 Duplicate Groups Found:</strong>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {duplicateCheck.duplicateGroups.slice(0, 5).map((group: any, i: number) => (
                          <div key={i} className="bg-orange-50 p-2 rounded text-xs border">
                            <div className="font-semibold">"{group.sections[0].title}" ({group.count} copies)</div>
                            <div className="text-gray-600 space-y-1">
                              {group.sections.map((section: any, j: number) => (
                                <div key={j} className="text-xs">
                                  ID {section.id} - {section.category} - {section.hasAI ? '✅ AI' : '❌ No AI'} - {new Date(section.created).toLocaleString()}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {duplicateCheck.duplicateGroups.length > 5 && (
                        <p className="text-xs mt-1">...and {duplicateCheck.duplicateGroups.length - 5} more duplicate groups</p>
                      )}
                    </div>
                  )}

                  {duplicateCheck.potentialDuplicates && duplicateCheck.potentialDuplicates.length > 0 && (
                    <div>
                      <strong className="block">⚠️ Potential Similar Sections:</strong>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {duplicateCheck.potentialDuplicates.slice(0, 3).map((potential: any, i: number) => (
                          <div key={i} className="bg-yellow-50 p-2 rounded text-xs border">
                            <div>Similarity: {Math.round(potential.similarity * 100)}%</div>
                            <div>"{potential.title1}"</div>
                            <div>"{potential.title2}"</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expected Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Coverage Expansion:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• From ~70% to ~95% Etsy policy coverage</li>
                <li>• ~30-50 new AI-processed sections</li>
                <li>• Detailed prohibited items subcategories</li>
                <li>• Production partner compliance rules</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">New Compliance Rules:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• ~60+ new detailed compliance rules</li>
                <li>• Hazardous materials & safety items</li>
                <li>• Enhanced IP and trademark rules</li>
                <li>• Fee avoidance & community violations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">AI Processing:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Automatic deduplication (no reprocessing)</li>
                <li>• Cost-efficient (only new content)</li>
                <li>• Enhanced trademark detection</li>
                <li>• Better handmade verification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PolicyExpansionManager;