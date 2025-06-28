
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { analyzeTextCompliance } from "@/utils/complianceAnalyzer";
import { createError, getErrorMessage } from "@/utils/errorHandler";
import { Loader2 } from "lucide-react";

interface ListingCheck {
  id: string;
  title: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  createdAt: string;
  flaggedTerms: string[];
  suggestions: string[];
}

interface ComplianceCheckFormProps {
  onCheckComplete: (result: ListingCheck) => void;
}

const ComplianceCheckForm = ({ onCheckComplete }: ComplianceCheckFormProps) => {
  const [listingTitle, setListingTitle] = useState("");
  const [listingDescription, setListingDescription] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    setError(null);
    
    // Validation
    if (!listingTitle.trim() && !listingDescription.trim()) {
      setError("Please enter a listing title or description to check");
      return;
    }

    setIsChecking(true);
    
    try {
      const analysisResult = await analyzeTextCompliance(listingTitle, listingDescription);
      
      const result: ListingCheck = {
        id: Date.now().toString(),
        title: listingTitle,
        description: listingDescription,
        status: analysisResult.status,
        createdAt: new Date().toISOString(),
        flaggedTerms: analysisResult.flaggedTerms,
        suggestions: analysisResult.suggestions
      };
      
      onCheckComplete(result);
      
      // Success toast
      if (analysisResult.status === 'pass') {
        toast({
          title: "✅ Compliance Check Passed",
          description: "Your listing looks good to go!",
        });
      } else if (analysisResult.status === 'warning') {
        toast({
          title: "⚠️ Policy Warnings Found",
          description: `Found ${analysisResult.flaggedTerms.length} potential issues to review.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Compliance Issues Found",
          description: `Found ${analysisResult.flaggedTerms.length} violations that need fixing.`,
          variant: "destructive",
        });
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(`Error checking listing: ${errorMessage}`);
      toast({
        title: "Error",
        description: "Error checking listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Quick Compliance Check</CardTitle>
        <CardDescription>
          Check your listing against Etsy's latest Creativity Standards (Updated July 2024)
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
            disabled={isChecking}
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
            disabled={isChecking}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleCheck} 
          disabled={isChecking}
          className="bg-trust-600 hover:bg-trust-700"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Policy Compliance...
            </>
          ) : (
            "Check Against Etsy Policies"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ComplianceCheckForm;
