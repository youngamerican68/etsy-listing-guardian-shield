import { supabase } from '@/integrations/supabase/client';

export interface ComplianceAnalytics {
  totalAnalyses: number;
  cacheHitRate: number;
  avgConfidence: number;
  complianceRate: number;
  topFlaggedTerms: Array<{ term: string; count: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  confidenceDistribution: Array<{ range: string; count: number }>;
  dailyAnalyses: Array<{ date: string; count: number }>;
}

export const getComplianceAnalytics = async (): Promise<ComplianceAnalytics> => {
  try {
    // Get cache statistics
    const { data: cacheData, error: cacheError } = await supabase
      .from('compliance_cache')
      .select('hit_count, confidence, status, flagged_terms, created_at');

    if (cacheError) throw cacheError;

    // Get compliance proofs statistics
    const { data: proofsData, error: proofsError } = await supabase
      .from('compliance_proofs')
      .select('compliance_status, flagged_terms, generated_at');

    if (proofsError) throw proofsError;

    // Calculate total analyses (cache + direct proofs)
    const totalCacheAnalyses = cacheData?.reduce((sum, entry) => sum + entry.hit_count, 0) || 0;
    const totalProofAnalyses = proofsData?.length || 0;
    const totalAnalyses = totalCacheAnalyses + totalProofAnalyses;

    // Calculate cache hit rate
    const cacheHitRate = totalAnalyses > 0 ? (totalCacheAnalyses / totalAnalyses) * 100 : 0;

    // Calculate average confidence from cache
    const avgConfidence = cacheData?.length > 0 
      ? cacheData.reduce((sum, entry) => sum + Number(entry.confidence), 0) / cacheData.length 
      : 0;

    // Calculate compliance rate
    const compliantCount = [
      ...(cacheData?.filter(entry => entry.status === 'compliant') || []),
      ...(proofsData?.filter(entry => entry.compliance_status === 'compliant') || [])
    ].length;
    const complianceRate = totalAnalyses > 0 ? (compliantCount / totalAnalyses) * 100 : 0;

    // Get top flagged terms
    const allFlaggedTerms: string[] = [];
    cacheData?.forEach(entry => {
      if (entry.flagged_terms) {
        allFlaggedTerms.push(...entry.flagged_terms);
      }
    });
    proofsData?.forEach(entry => {
      if (entry.flagged_terms) {
        allFlaggedTerms.push(...entry.flagged_terms);
      }
    });

    const termCounts = allFlaggedTerms.reduce((acc, term) => {
      acc[term] = (acc[term] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topFlaggedTerms = Object.entries(termCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }));

    // Get status distribution
    const allStatuses = [
      ...(cacheData?.map(entry => entry.status) || []),
      ...(proofsData?.map(entry => entry.compliance_status) || [])
    ];
    const statusCounts = allStatuses.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDistribution = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }));

    // Get confidence distribution
    const confidenceRanges = [
      { range: '0-0.2', min: 0, max: 0.2 },
      { range: '0.2-0.4', min: 0.2, max: 0.4 },
      { range: '0.4-0.6', min: 0.4, max: 0.6 },
      { range: '0.6-0.8', min: 0.6, max: 0.8 },
      { range: '0.8-1.0', min: 0.8, max: 1.0 }
    ];

    const confidenceDistribution = confidenceRanges.map(({ range, min, max }) => ({
      range,
      count: cacheData?.filter(entry => {
        const conf = Number(entry.confidence);
        return conf >= min && conf <= max;
      }).length || 0
    }));

    // Get daily analyses for the last 30 days
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyAnalyses = last30Days.map(date => {
      const cacheCount = cacheData?.filter(entry => 
        entry.created_at.startsWith(date)
      ).length || 0;
      const proofCount = proofsData?.filter(entry => 
        entry.generated_at && entry.generated_at.startsWith(date)
      ).length || 0;
      
      return {
        date,
        count: cacheCount + proofCount
      };
    });

    return {
      totalAnalyses,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      complianceRate: Math.round(complianceRate * 100) / 100,
      topFlaggedTerms,
      statusDistribution,
      confidenceDistribution,
      dailyAnalyses
    };
  } catch (error) {
    console.error('Error fetching compliance analytics:', error);
    throw error;
  }
};