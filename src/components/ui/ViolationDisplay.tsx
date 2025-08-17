import React, { useState } from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent } from './card';
import { Alert, AlertDescription } from './alert';
import { 
  AlertTriangle, 
  ExternalLink, 
  Info,
  Eye,
  EyeOff,
  XCircle,
  Shield
} from 'lucide-react';

interface ViolationDisplayProps {
  issue: {
    type: string;
    term: string;
    category: string;
    description: string;
    found_in?: {
      context: string;
      displayContext?: {
        before: string;
        term: string;
        after: string;
      };
    };
  };
  onMarkFalsePositive: (term: string, reason: string) => void;
  onLearnMore: (policySection: string) => void;
  debugKey?: string;
  debugOriginalTerm?: string;
}

const ViolationDisplay: React.FC<ViolationDisplayProps> = ({
  issue,
  onMarkFalsePositive,
  onLearnMore,
  debugKey,
  debugOriginalTerm
}) => {
  const [showFalsePositiveForm, setShowFalsePositiveForm] = useState(false);
  const [falsePositiveReason, setFalsePositiveReason] = useState('');
  const [showDetails, setShowDetails] = useState(false);


  const handleMarkFalsePositive = () => {
    if (falsePositiveReason.trim()) {
      onMarkFalsePositive(issue.term, falsePositiveReason);
      setShowFalsePositiveForm(false);
      setFalsePositiveReason('');
    }
  };

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Issue Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-red-100 text-red-800 border-red-300">
                <AlertTriangle className="h-4 w-4 mr-1" />
                VIOLATION
              </Badge>
              <Badge variant="outline">{issue.category}</Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Flagged term:</span>
                <code className="px-2 py-1 bg-red-50 text-red-700 rounded text-sm font-mono">
                  "{issue.term}"
                </code>
              </div>
              
              <p className="text-sm text-gray-600">{issue.description}</p>
              
              {/* Context Display */}
              {issue.found_in?.context && (
                <div className="mt-2">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showDetails ? 'Hide' : 'Show'} context
                  </button>
                  
                  {showDetails && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono border">
                      <div className="text-gray-500 mb-1">Found in context:</div>
                      <div className="break-words">
                        ...{issue.found_in.context}...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFalsePositiveForm(!showFalsePositiveForm)}
            className="text-xs"
          >
            <XCircle className="h-3 w-3 mr-1" />
            Mark as False Positive
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLearnMore(issue.category)}
            className="text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Learn More
          </Button>
        </div>

        {/* False Positive Form */}
        {showFalsePositiveForm && (
          <Alert>
            <AlertDescription>
              <div className="space-y-3">
                <p className="text-sm">Why do you think this is a false positive?</p>
                <textarea
                  value={falsePositiveReason}
                  onChange={(e) => setFalsePositiveReason(e.target.value)}
                  placeholder="e.g., This is a legitimate product name, not a trademark violation..."
                  className="w-full p-2 text-sm border rounded resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleMarkFalsePositive}
                    disabled={!falsePositiveReason.trim()}
                  >
                    Submit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowFalsePositiveForm(false);
                      setFalsePositiveReason('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ViolationDisplay;