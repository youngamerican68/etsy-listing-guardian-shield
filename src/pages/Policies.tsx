import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, FileText, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { policyParserService } from '@/services/policyParserService';
import PolicyBrowser from '@/components/policies/PolicyBrowser';
import PolicySearch from '@/components/policies/PolicySearch';
import PolicyDetails from '@/components/policies/PolicyDetails';

const Policies = () => {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePolicies = async () => {
    setIsUpdating(true);
    
    try {
      const result = await policyParserService.parseAllEtsyPolicies();
      
      if (result.success) {
        toast({
          title: "Policies successfully updated!",
          description: result.message,
        });
        // Trigger a page refresh to show new data
        window.location.reload();
      } else {
        toast({
          title: "Failed to update policies",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to update policies",
        description: "Check the function logs for more details.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Policies', count: 0 },
    { id: 'prohibited_items', label: 'Prohibited Items', count: 0 },
    { id: 'intellectual_property', label: 'Intellectual Property', count: 0 },
    { id: 'handmade_reselling', label: 'Handmade & Reselling', count: 0 },
    { id: 'account_integrity', label: 'Account Integrity', count: 0 },
    { id: 'fees_payments', label: 'Fees & Payments', count: 0 },
    { id: 'community_conduct', label: 'Community Conduct', count: 0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Policy Explorer
              </h1>
              <p className="text-muted-foreground mt-2">
                Browse, search, and understand Etsy's Terms of Service in plain English
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Policies Analyzed
              </Badge>
              <Button
                onClick={handleUpdatePolicies}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                {isUpdating ? 'Analyzing...' : 'Analyze & Update Policies'}
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search policies, keywords, or violations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-12 text-lg"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className="flex items-center gap-2"
              >
                {category.label}
                {category.count > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {category.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Policy Browser */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Policy Sections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PolicyBrowser
                  category={activeCategory}
                  searchQuery={searchQuery}
                  onSelectPolicy={setSelectedPolicyId}
                  selectedPolicyId={selectedPolicyId}
                />
              </CardContent>
            </Card>
          </div>

          {/* Policy Details or Search Results */}
          <div className="lg:col-span-2">
            {selectedPolicyId ? (
              <PolicyDetails policyId={selectedPolicyId} />
            ) : searchQuery ? (
              <PolicySearch query={searchQuery} />
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Select a policy to explore</p>
                  <p className="text-sm">
                    Choose a policy section from the left to view detailed information,<br />
                    plain English summaries, and related keywords.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Help Section */}
        <Card className="mt-8 border-accent/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Info className="h-6 w-6 text-accent mt-1" />
              <div>
                <h3 className="font-semibold text-lg mb-2">How to Use the Policy Explorer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <h4 className="font-medium text-foreground mb-1">🔍 Search</h4>
                    <p>Search for specific terms, violations, or keywords across all policies.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">📂 Browse by Category</h4>
                    <p>Filter policies by category to focus on specific areas of interest.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">📖 Plain English</h4>
                    <p>View AI-generated summaries that explain complex policy language simply.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-1">🔗 Cross-References</h4>
                    <p>Explore related policies and see how different rules connect.</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Policies;