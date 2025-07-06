import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { policyParserService } from '@/services/policyParserService';

interface PolicySection {
  id: string;
  section_title: string;
  category: string;
  risk_level: string;
  plain_english_summary: string;
  policy_id: string;
  etsy_policies: {
    title: string;
  };
}

interface PolicyBrowserProps {
  category: string;
  searchQuery: string;
  onSelectPolicy: (policyId: string) => void;
  selectedPolicyId: string | null;
}

const PolicyBrowser = ({ category, searchQuery, onSelectPolicy, selectedPolicyId }: PolicyBrowserProps) => {
  const [policies, setPolicies] = useState<PolicySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await policyParserService.getStoredPolicies();
      
      // Flatten policy sections for easier browsing
      const sections: PolicySection[] = [];
      data.forEach(policy => {
        if (policy.policy_sections) {
          policy.policy_sections.forEach(section => {
            sections.push({
              id: section.id,
              section_title: section.section_title,
              category: section.category,
              risk_level: section.risk_level,
              plain_english_summary: section.plain_english_summary || '',
              policy_id: policy.id,
              etsy_policies: {
                title: policy.title
              }
            });
          });
        }
      });
      
      setPolicies(sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesCategory = category === 'all' || policy.category === category;
    const matchesSearch = !searchQuery || 
      policy.section_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.plain_english_summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.etsy_policies.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    if (riskLevel === 'critical' || riskLevel === 'high') {
      return <AlertTriangle className="h-3 w-3" />;
    }
    return <FileText className="h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Loading policies...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button size="sm" variant="outline" onClick={loadPolicies}>
          Try Again
        </Button>
      </div>
    );
  }

  if (filteredPolicies.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
        <p className="text-sm text-muted-foreground">
          No policies found matching your criteria
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-96">
      <div className="space-y-2">
        {filteredPolicies.map((policy) => (
          <Card
            key={policy.id}
            className={`cursor-pointer transition-all hover:shadow-sm ${
              selectedPolicyId === policy.id ? 'ring-2 ring-primary bg-primary/5' : ''
            }`}
            onClick={() => onSelectPolicy(policy.id)}
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-sm leading-tight line-clamp-2">
                    {policy.section_title}
                  </h4>
                  <Badge
                    className={`${getRiskColor(policy.risk_level)} flex items-center gap-1 text-xs`}
                  >
                    {getRiskIcon(policy.risk_level)}
                    {policy.risk_level}
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {policy.plain_english_summary || 'No summary available'}
                </p>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {policy.etsy_policies.title}
                  </span>
                  <Badge variant="outline">
                    {policy.category.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};

export default PolicyBrowser;