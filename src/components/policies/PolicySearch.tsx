import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, Hash, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { policyParserService } from '@/services/policyParserService';

interface SearchResult {
  type: 'section' | 'keyword';
  id: string;
  title: string;
  content: string;
  summary?: string;
  category: string;
  risk_level: string;
  policy_title: string;
  context?: string;
  keyword?: string;
}

interface PolicySearchProps {
  query: string;
}

const PolicySearch = ({ query }: PolicySearchProps) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length >= 2) {
      performSearch(query);
    } else {
      setResults([]);
    }
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Search in policy sections and keywords
      const [policies, keywords] = await Promise.all([
        policyParserService.getStoredPolicies(),
        policyParserService.getPolicyKeywords()
      ]);

      const searchResults: SearchResult[] = [];
      const queryLower = searchQuery.toLowerCase();

      // Search policy sections
      policies.forEach(policy => {
        if (policy.policy_sections) {
          policy.policy_sections.forEach(section => {
            const matchesTitle = section.section_title.toLowerCase().includes(queryLower);
            // Note: section_content and plain_english_summary might not be available in the list view
            // We'll need to fetch full details if needed
            const matchesSummary = true; // placeholder for now

            if (matchesTitle) {
              searchResults.push({
                type: 'section',
                id: section.id,
                title: section.section_title,
                content: '', // Will be loaded on demand
                summary: '', // Will be loaded on demand
                category: section.category,
                risk_level: section.risk_level,
                policy_title: policy.title
              });
            }
          });
        }
      });

      // Search keywords
      keywords.forEach(keyword => {
        const matchesKeyword = keyword.keyword.toLowerCase().includes(queryLower);
        const matchesContext = keyword.context?.toLowerCase().includes(queryLower);

        if (matchesKeyword || matchesContext) {
          searchResults.push({
            type: 'keyword',
            id: keyword.id,
            title: `Keyword: ${keyword.keyword}`,
            content: keyword.context || '',
            category: keyword.policy_sections?.category || 'unknown',
            risk_level: keyword.risk_level,
            policy_title: keyword.policy_sections?.etsy_policies?.title || 'Unknown Policy',
            context: keyword.context,
            keyword: keyword.keyword
          });
        }
      });

      // Sort by relevance (exact matches first, then risk level)
      searchResults.sort((a, b) => {
        const aExact = a.title.toLowerCase() === queryLower || a.keyword?.toLowerCase() === queryLower;
        const bExact = b.title.toLowerCase() === queryLower || b.keyword?.toLowerCase() === queryLower;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (riskOrder[b.risk_level as keyof typeof riskOrder] || 0) - 
               (riskOrder[a.risk_level as keyof typeof riskOrder] || 0);
      });

      setResults(searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
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

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-primary/20 text-primary font-semibold">
          {part}
        </mark>
      ) : part
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Searching policies...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button size="sm" variant="outline" onClick={() => performSearch(query)}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Results for "{query}"
            <Badge variant="secondary">{results.length} found</Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {results.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No results found for "{query}"
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Try different keywords or browse by category
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {results.map((result) => (
              <Card key={`${result.type}-${result.id}`} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {result.type === 'keyword' ? (
                          <Hash className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        ) : (
                          <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg leading-tight">
                            {highlightText(result.title, query)}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {result.policy_title}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          className={`${getRiskColor(result.risk_level)} text-xs`}
                        >
                          {result.risk_level}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {result.category.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    {result.summary && (
                      <div className="bg-secondary/50 rounded-lg p-4">
                        <p className="text-sm font-medium text-secondary-foreground mb-2">
                          Plain English Summary:
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {highlightText(result.summary, query)}
                        </p>
                      </div>
                    )}

                    {result.context && (
                      <div className="bg-accent/10 rounded-lg p-4">
                        <p className="text-sm font-medium text-accent-foreground mb-2">
                          Context:
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {highlightText(result.context, query)}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {result.type === 'keyword' ? (
                          <span>Prohibited keyword</span>
                        ) : (
                          <span>Policy section</span>
                        )}
                      </div>
                      <Button size="sm" variant="outline" className="text-xs">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default PolicySearch;