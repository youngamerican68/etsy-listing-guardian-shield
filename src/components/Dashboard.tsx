import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ListingCheck {
  id: string;
  title: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  createdAt: string;
  flaggedTerms: string[];
  suggestions: string[];
}

interface ComplianceProof {
  id: string;
  listingCheckId: string;
  publicToken: string;
  archivedTitle: string;
  archivedDescription: string;
  generatedAt: string;
}

interface DashboardProps {
  userTier: 'free' | 'pro';
  onUpgrade: () => void;
}

const Dashboard = ({ userTier, onUpgrade }: DashboardProps) => {
  const [listingTitle, setListingTitle] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [currentResult, setCurrentResult] = useState<ListingCheck | null>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [currentProof, setCurrentProof] = useState<ComplianceProof | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  // Mock data for listing history
  const [checkHistory] = useState<ListingCheck[]>([
    {
      id: "1",
      title: "Handmade Sterling Silver Earrings",
      description: "Beautiful handcrafted earrings made with genuine sterling silver...",
      status: "pass",
      createdAt: "2024-01-15T10:30:00Z",
      flaggedTerms: [],
      suggestions: []
    },
    {
      id: "2", 
      title: "Disney-Inspired Princess Dress",
      description: "Perfect dress for your little princess, Disney-style design...",
      status: "fail",
      createdAt: "2024-01-14T15:45:00Z",
      flaggedTerms: ["Disney", "Princess"],
      suggestions: ["Royal-Inspired Dress", "Fairy Tale Costume", "Magic Kingdom Style Dress"]
    },
    {
      id: "3",
      title: "Vintage Nike-Style Sneakers",
      description: "Classic sneaker design inspired by retro athletics...",
      status: "warning",
      createdAt: "2024-01-12T09:15:00Z",
      flaggedTerms: ["Nike-Style"],
      suggestions: ["Vintage Athletic Sneakers", "Retro Sports Shoes", "Classic Runner Design"]
    }
  ]);

  const mockComplianceCheck = async (title: string, description: string): Promise<ListingCheck> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const flaggedTerms: string[] = [];
    const suggestions: string[] = [];
    let status: 'pass' | 'warning' | 'fail' = 'pass';
    
    const text = `${title} ${description}`.toLowerCase();
    
    // Mock compliance logic
    const riskTerms = ['disney', 'nike', 'apple', 'marvel', 'pokemon', 'gucci', 'louis vuitton'];
    const warningTerms = ['inspired', 'style', 'type', 'like'];
    
    riskTerms.forEach(term => {
      if (text.includes(term)) {
        flaggedTerms.push(term);
        status = 'fail';
        suggestions.push(`Consider removing "${term}" and use generic descriptions`);
      }
    });
    
    warningTerms.forEach(term => {
      if (text.includes(term) && status === 'pass') {
        flaggedTerms.push(term);
        status = 'warning';
        suggestions.push(`Use more specific descriptive words instead of "${term}"`);
      }
    });

    return {
      id: Date.now().toString(),
      title,
      description,
      status,
      createdAt: new Date().toISOString(),
      flaggedTerms,
      suggestions
    };
  };

  const generateComplianceProof = async (listingCheck: ListingCheck) => {
    if (userTier !== 'pro') {
      toast({
        title: "Pro Feature Required",
        description: "Upgrade to Pro to generate compliance certificates.",
        variant: "destructive",
      });
      return;
    }

    if (listingCheck.status !== 'pass') {
      toast({
        title: "Cannot Generate Proof",
        description: "Only listings that pass compliance checks can generate certificates.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingProof(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const publicToken = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const proof: ComplianceProof = {
        id: Date.now().toString(),
        listingCheckId: listingCheck.id,
        publicToken,
        archivedTitle: listingCheck.title,
        archivedDescription: listingCheck.description,
        generatedAt: new Date().toISOString()
      };

      setCurrentProof(proof);
      setShowProofDialog(true);
      
      toast({
        title: "Compliance Certificate Generated",
        description: "Your shareable compliance proof is ready.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate compliance certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const copyProofLink = () => {
    if (currentProof) {
      const proofUrl = `${window.location.origin}/proof/${currentProof.publicToken}`;
      navigator.clipboard.writeText(proofUrl);
      toast({
        title: "Link Copied",
        description: "Compliance certificate link copied to clipboard.",
      });
    }
  };

  const openProofPage = () => {
    if (currentProof) {
      const proofUrl = `${window.location.origin}/proof/${currentProof.publicToken}`;
      window.open(proofUrl, '_blank');
    }
  };

  const handleCheck = async () => {
    if (!listingTitle.trim() && !listingDescription.trim()) {
      alert("Please enter a listing title or description to check");
      return;
    }

    setIsChecking(true);
    try {
      const result = await mockComplianceCheck(listingTitle, listingDescription);
      setCurrentResult(result);
    } catch (error) {
      alert("Error checking listing. Please try again.");
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-success-50 text-success-700 border-success-200';
      case 'warning': return 'bg-warning-50 text-warning-700 border-warning-200';
      case 'fail': return 'bg-danger-50 text-danger-700 border-danger-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'warning': return '⚠️';
      case 'fail': return '❌';
      default: return '📄';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Listing Shield Dashboard
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              {userTier === 'free' ? 'Free Tier - 5 checks per month' : 'Pro Tier - Unlimited checks'}
            </p>
            {userTier === 'free' && (
              <Button onClick={onUpgrade} className="bg-trust-600 hover:bg-trust-700">
                Upgrade to Pro
              </Button>
            )}
          </div>
        </div>

        {/* Quick Check Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Compliance Check</CardTitle>
            <CardDescription>
              Paste your listing details below to check for potential violations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Listing Title</Label>
              <Input
                id="title"
                placeholder="Enter your listing title..."
                value={listingTitle}
                onChange={(e) => setListingTitle(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Listing Description</Label>
              <Textarea
                id="description"
                placeholder="Paste your full listing description here..."
                value={listingDescription}
                onChange={(e) => setListingDescription(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>

            <Button 
              onClick={handleCheck} 
              disabled={isChecking}
              className="bg-trust-600 hover:bg-trust-700"
            >
              {isChecking ? "Analyzing..." : "Check Compliance"}
            </Button>
          </CardContent>
        </Card>

        {/* Current Result */}
        {currentResult && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{getStatusIcon(currentResult.status)}</span>
                Compliance Check Result
              </CardTitle>
              <Badge className={getStatusColor(currentResult.status)}>
                {currentResult.status.toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900">Checked Listing:</h4>
                  <p className="text-sm text-gray-600 font-medium">{currentResult.title}</p>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{currentResult.description}</p>
                </div>
                
                {currentResult.flaggedTerms.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Flagged Terms:</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentResult.flaggedTerms.map((term, index) => (
                        <Badge key={index} variant="destructive">{term}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {currentResult.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Suggestions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {currentResult.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-600">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentResult.status === 'pass' && (
                  <Button 
                    onClick={() => generateComplianceProof(currentResult)}
                    disabled={isGeneratingProof || userTier !== 'pro'}
                    variant="outline" 
                    className="mt-4"
                  >
                    {isGeneratingProof ? "Generating..." : "Generate Compliance Certificate"}
                    {userTier !== 'pro' && " (Pro Only)"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Check History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Compliance Checks</CardTitle>
            <CardDescription>
              {userTier === 'free' ? 'Showing last 10 checks' : 'Complete check history'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checkHistory.map((check) => (
                <div key={check.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span>{getStatusIcon(check.status)}</span>
                      <h4 className="font-medium text-gray-900">{check.title}</h4>
                      <Badge className={getStatusColor(check.status)}>
                        {check.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1">{check.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(check.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                    {check.status === 'pass' && userTier === 'pro' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateComplianceProof(check)}
                        disabled={isGeneratingProof}
                      >
                        Generate Proof
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Proof Dialog */}
        <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Compliance Certificate Generated</DialogTitle>
              <DialogDescription>
                Your listing has been verified as compliant. Share this certificate with marketplaces or customers as proof of compliance.
              </DialogDescription>
            </DialogHeader>
            {currentProof && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm text-gray-900 mb-2">Certificate Details</h4>
                  <p className="text-sm text-gray-600">
                    <strong>Listing:</strong> {currentProof.archivedTitle}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Verified:</strong> {new Date(currentProof.generatedAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Token:</strong> {currentProof.publicToken}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button onClick={copyProofLink} className="flex-1">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button onClick={openProofPage} variant="outline" className="flex-1">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Certificate
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  This certificate is publicly accessible and can be shared with anyone.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Dashboard;
