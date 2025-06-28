
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { complianceEngine } from "@/utils/complianceEngine";

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

  const mockComplianceCheck = async (title: string, description: string): Promise<ListingCheck> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const result = complianceEngine.analyzeCompliance(title, description);
    
    return {
      id: Date.now().toString(),
      title,
      description,
      status: result.status,
      createdAt: new Date().toISOString(),
      flaggedTerms: result.flaggedTerms,
      suggestions: result.suggestions
    };
  };

  const handleCheck = async () => {
    if (!listingTitle.trim() && !listingDescription.trim()) {
      toast({
        title: "Missing Content",
        description: "Please enter a listing title or description to check",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    try {
      const result = await mockComplianceCheck(listingTitle, listingDescription);
      onCheckComplete(result);
      
      if (result.status === 'pass') {
        toast({
          title: "✅ Compliance Check Passed",
          description: "Your listing looks good to go!",
        });
      } else if (result.status === 'warning') {
        toast({
          title: "⚠️ Policy Warnings Found",
          description: `Found ${result.flaggedTerms.length} potential issues to review.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "❌ Compliance Issues Found",
          description: `Found ${result.flaggedTerms.length} violations that need fixing.`,
          variant: "destructive",
        });
      }
    } catch (error) {
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
          {isChecking ? "Analyzing Policy Compliance..." : "Check Against Etsy Policies"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ComplianceCheckForm;
