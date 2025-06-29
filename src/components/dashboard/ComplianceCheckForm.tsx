
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeDatabaseCompliance } from "@/utils/databaseComplianceAnalyzer";
import { analyzeTextCompliance } from "@/utils/complianceAnalyzer";

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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      return;
    }

    setIsChecking(true);

    try {
      // First, run database-driven compliance check
      const databaseResult = await analyzeDatabaseCompliance(title, description);
      
      // If database check passes, run additional AI analysis for edge cases
      let finalResult = databaseResult;
      
      if (databaseResult.status === 'pass') {
        const aiResult = await analyzeTextCompliance(title, description);
        // Merge results, prioritizing database findings
        finalResult = {
          ...aiResult,
          flaggedTerms: [...databaseResult.flaggedTerms, ...aiResult.flaggedTerms],
          suggestions: [...databaseResult.suggestions, ...aiResult.suggestions],
          status: aiResult.status === 'fail' ? 'fail' : databaseResult.status,
          confidence: Math.min(databaseResult.confidence, aiResult.confidence)
        };
      }

      const result: ListingCheck = {
        id: Date.now().toString(),
        title,
        description,
        status: finalResult.status,
        createdAt: new Date().toISOString(),
        flaggedTerms: finalResult.flaggedTerms,
        suggestions: finalResult.suggestions
      };

      onCheckComplete(result);
      
      // Clear form after successful check
      setTitle("");
      setDescription("");
    } catch (error) {
      console.error('Compliance check failed:', error);
      // Create error result
      const errorResult: ListingCheck = {
        id: Date.now().toString(),
        title,
        description,
        status: 'warning',
        createdAt: new Date().toISOString(),
        flaggedTerms: [],
        suggestions: ['Compliance check failed. Please try again or contact support.']
      };
      onCheckComplete(errorResult);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Check Your Listing</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Listing Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter your listing title..."
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Listing Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter your listing description..."
              rows={4}
              required
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={isChecking || !title.trim() || !description.trim()}
            className="w-full"
          >
            {isChecking ? "Analyzing..." : "Check Compliance"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ComplianceCheckForm;
