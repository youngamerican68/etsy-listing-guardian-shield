import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Hash, 
  AlertTriangle, 
  ExternalLink, 
  Loader2,
  Link2,
  MessageSquare,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PolicyKeyword {
  id: string;
  keyword: string;
  risk_level: string;
  context: string;
}

interface PolicyReference {
  id: string;
  reference_type: string;
  target_section: {
    id: string;
    section_title: string;
    category: string;
  };
}

interface PolicyDetailsData {
  id: string;
  section_title: string;
  section_content: string;
  plain_english_summary: string;
  category: string;
  risk_level: string;
  order_index: number;
  policy: {
    title: string;
    url: string;
    category: string;
    last_updated: string;
  };
  keywords: PolicyKeyword[];
  references: PolicyReference[];
}

interface PolicyDetailsProps {
  policyId: string;
}

const PolicyDetails = ({ policyId }: PolicyDetailsProps) => {
  const [policy, setPolicy] = useState<PolicyDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPolicyDetails();
  }, [policyId]);

  const loadPolicyDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch policy section with related data
      const { data: sectionData, error: sectionError } = await supabase
        .from('policy_sections')
        .select(`
          *,
          etsy_policies!policy_sections_policy_id_fkey (
            title,
            url,
            category,
            last_updated
          )
        `)
        .eq('id', policyId)
        .single();

      if (sectionError) throw sectionError;

      // Fetch keywords for this section
      const { data: keywordsData, error: keywordsError } = await supabase
        .from('policy_keywords')
        .select('*')
        .eq('policy_section_id', policyId)
        .eq('is_active', true)
        .order('risk_level', { ascending: false });

      if (keywordsError) throw keywordsError;

      // Fetch cross-references
      const { data: referencesData, error: referencesError } = await supabase
        .from('policy_references')
        .select(`
          *,
          policy_sections!policy_references_target_section_id_fkey (
            id,
            section_title,
            category
          )
        `)
        .eq('source_section_id', policyId);

      if (referencesError) throw referencesError;

      // Transform references data to match interface
      const transformedReferences = referencesData?.map(ref => ({
        ...ref,
        target_section: ref.policy_sections
      })) || [];

      setPolicy({
        ...sectionData,
        policy: sectionData.etsy_policies,
        keywords: keywordsData || [],
        references: transformedReferences
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policy details');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getReferenceIcon = (type: string) => {
    switch (type) {
      case 'related': return <Link2 className="h-4 w-4" />;
      case 'exception': return <AlertTriangle className="h-4 w-4" />;
      case 'clarification': return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Loading policy details...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !policy) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-sm text-destructive mb-4">{error || 'Policy not found'}</p>
          <Button size="sm" variant="outline" onClick={loadPolicyDetails}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl leading-tight mb-2">
                {policy.section_title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                From: {policy.policy.title}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge
                className={`${getRiskColor(policy.risk_level)} flex items-center gap-1`}
              >
                <Shield className="h-3 w-3" />
                {policy.risk_level}
              </Badge>
              <Badge variant="outline">
                {policy.category.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Content Tabs */}
      <Card>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Plain English</TabsTrigger>
            <TabsTrigger value="original">Original Text</TabsTrigger>
            <TabsTrigger value="keywords">
              Keywords ({policy.keywords.length})
            </TabsTrigger>
            <TabsTrigger value="references">
              References ({policy.references.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-4">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Plain English Summary
                  </h4>
                  <p className="text-sm leading-relaxed">
                    {policy.plain_english_summary || 'No summary available for this policy section.'}
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                  <span>Last updated: {new Date(policy.policy.last_updated).toLocaleDateString()}</span>
                  <Button size="sm" variant="outline" asChild>
                    <a href={policy.policy.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Original
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </TabsContent>

          <TabsContent value="original" className="mt-4">
            <CardContent className="p-6">
              <ScrollArea className="h-96">
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {policy.section_content}
                  </p>
                </div>
              </ScrollArea>
            </CardContent>
          </TabsContent>

          <TabsContent value="keywords" className="mt-4">
            <CardContent className="p-6">
              {policy.keywords.length === 0 ? (
                <div className="text-center py-8">
                  <Hash className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No keywords extracted for this policy section
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {policy.keywords.map((keyword) => (
                    <Card key={keyword.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Hash className="h-4 w-4 text-primary" />
                            <span className="font-medium">{keyword.keyword}</span>
                            <Badge
                              className={`${getRiskColor(keyword.risk_level)} text-xs`}
                            >
                              {keyword.risk_level}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {keyword.context}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="references" className="mt-4">
            <CardContent className="p-6">
              {policy.references.length === 0 ? (
                <div className="text-center py-8">
                  <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    No cross-references found for this policy section
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {policy.references.map((reference) => (
                    <Card key={reference.id} className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        {getReferenceIcon(reference.reference_type)}
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {reference.target_section.section_title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              {reference.reference_type}
                            </Badge>
                            <Badge variant="outline">
                              {reference.target_section.category.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default PolicyDetails;