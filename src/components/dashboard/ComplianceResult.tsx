
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface ListingCheck {
  id: string;
  title: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  createdAt: string;
  flaggedTerms: string[];
  suggestions: string[];
}

interface ComplianceResultProps {
  result: ListingCheck;
  userTier: 'free' | 'pro';
  isGeneratingProof: boolean;
  onGenerateProof: (result: ListingCheck) => void;
}

const ComplianceResult = ({ result, userTier, isGeneratingProof, onGenerateProof }: ComplianceResultProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-success-50 text-success-700 border-success-200';
      case 'warning': return 'bg-warning-50 text-warning-700 border-warning-200';
      case 'fail': return 'bg-danger-50 text-danger-700 border-danger-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIconComponent = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-success-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-warning-600" />;
      case 'fail': return <XCircle className="w-5 h-5 text-danger-600" />;
      default: return <CheckCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIconComponent(result.status)}
          Etsy Policy Compliance Result
        </CardTitle>
        <Badge className={getStatusColor(result.status)}>
          {result.status.toUpperCase()}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900">Analyzed Listing:</h4>
            <p className="text-sm text-gray-600 font-medium">{result.title}</p>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{result.description}</p>
          </div>
          
          {result.flaggedTerms.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Policy Violations Detected:</h4>
              <div className="flex flex-wrap gap-2">
                {result.flaggedTerms.map((term, index) => (
                  <Badge key={index} variant="destructive" className="text-xs">
                    {term}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {result.suggestions.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Recommended Actions:</h4>
              <ul className="list-disc list-inside space-y-1">
                {result.suggestions.slice(0, 5).map((suggestion, index) => (
                  <li key={index} className="text-sm text-gray-600">{suggestion}</li>
                ))}
                {result.suggestions.length > 5 && (
                  <li className="text-sm text-gray-400 italic">...and {result.suggestions.length - 5} more recommendations</li>
                )}
              </ul>
            </div>
          )}

          {result.status === 'pass' && (
            <div className="bg-success-50 border border-success-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-success-600" />
                <h4 className="font-semibold text-success-800">Compliant with Etsy Policies</h4>
              </div>
              <p className="text-success-700 text-sm mb-3">
                Your listing passes all policy checks and is ready to publish.
              </p>
              <Button 
                onClick={() => onGenerateProof(result)}
                disabled={isGeneratingProof || userTier !== 'pro'}
                variant="outline" 
                className="border-success-300 text-success-700 hover:bg-success-50"
              >
                {isGeneratingProof ? "Generating Certificate..." : "Generate Compliance Certificate"}
                {userTier !== 'pro' && " (Pro Only)"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceResult;
