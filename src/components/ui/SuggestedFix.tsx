import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { Card, CardContent } from './card';
import { Alert, AlertDescription } from './alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Copy, 
  ExternalLink, 
  Info,
  Lightbulb,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';

interface SuggestedFix {
  originalTerm: string;
  alternatives: string[];
  reasoning: string;
  confidenceScore: number;
  estimatedFixTime: string; // e.g., "30 seconds"
  policyReference?: {
    section: string;
    link: string;
    why: string;
  };
}

interface SuggestedFixProps {
  issue: {
    type: string;
    term: string;
    category: string;
    risk_level: string;
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
  suggestedFix?: SuggestedFix;
  onApplyFix: (originalTerm: string, replacement: string) => void;
  onMarkFalsePositive: (term: string, reason: string) => void;
  onLearnMore: (policySection: string) => void;
  isLoading?: boolean;
  onRequestSuggestion?: () => void;
}

const SuggestedFix: React.FC<SuggestedFixProps> = ({
  issue,
  suggestedFix,
  onApplyFix,
  onMarkFalsePositive,
  onLearnMore,
  isLoading = false,
  onRequestSuggestion
}) => {
  const [selectedAlternative, setSelectedAlternative] = useState<string>('');
  const [showFalsePositiveForm, setShowFalsePositiveForm] = useState(false);
  const [falsePositiveReason, setFalsePositiveReason] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  // Automatically request suggestion when component mounts if none exists
  useEffect(() => {
    if (!suggestedFix && !isLoading && onRequestSuggestion) {
      console.log(`🔄 Auto-requesting suggestion for: "${issue.term}"`);
      onRequestSuggestion();
    }
  }, [issue.term, suggestedFix, isLoading, onRequestSuggestion]);

  const getRiskStyling = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const handleApplyFix = () => {
    if (selectedAlternative) {
      onApplyFix(issue.term, selectedAlternative);
    }
  };

  const handleMarkFalsePositive = () => {
    if (falsePositiveReason.trim()) {
      onMarkFalsePositive(issue.term, falsePositiveReason);
      setShowFalsePositiveForm(false);
      setFalsePositiveReason('');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Issue Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getRiskStyling(issue.risk_level)}>
                {getRiskIcon(issue.risk_level)}
                {issue.risk_level.toUpperCase()}
              </Badge>
              <Badge variant="outline">{issue.category}</Badge>
              {suggestedFix?.estimatedFixTime && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  <Clock className="h-3 w-3 mr-1" />
                  {suggestedFix.estimatedFixTime}
                </Badge>
              )}
              {/* Debug info for key matching */}
              {process.env.NODE_ENV === 'development' && (
                <Badge variant="outline" className="bg-gray-100 text-xs">
                  Key: {issue.term.toLowerCase().trim()}
                </Badge>
              )}
            </div>
            <p className="font-medium text-red-600 mb-1">
              Flagged term: "{issue.term}"
            </p>
            {issue.description && (
              <p className="text-sm text-gray-700 mb-2">
                {issue.description}
              </p>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="ml-2"
          >
            {showDetails ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Enhanced Context Display */}
        {issue.found_in?.displayContext && (
          <div className="bg-gray-50 p-3 rounded-lg border text-sm">
            <div className="font-medium text-gray-700 mb-2">Found in context:</div>
            <div className="font-mono text-gray-800">
              <span className="text-gray-600">...{issue.found_in.displayContext.before} </span>
              <span className="bg-red-100 text-red-800 px-1 py-0.5 rounded font-bold">
                {issue.found_in.displayContext.term}
              </span>
              <span className="text-gray-600"> {issue.found_in.displayContext.after}...</span>
            </div>
          </div>
        )}

        {/* Suggested Fix Section */}
        {suggestedFix && !isLoading && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold text-gray-800">Suggested Fix</span>
              {suggestedFix.confidenceScore && (
                <Badge variant="outline" className="text-xs">
                  {Math.round(suggestedFix.confidenceScore * 100)}% confidence
                </Badge>
              )}
              {/* Debug info for suggestion matching */}
              {process.env.NODE_ENV === 'development' && suggestedFix.originalTerm && (
                <Badge variant="outline" className="bg-green-100 text-xs">
                  For: {suggestedFix.originalTerm}
                </Badge>
              )}
            </div>

            {/* Alternative Options */}
            <div className="space-y-2 mb-4">
              {(suggestedFix.alternatives || []).map((alternative, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAlternative === alternative
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedAlternative(alternative)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">
                      "{alternative}"
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(alternative);
                        }}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <input
                        type="radio"
                        checked={selectedAlternative === alternative}
                        onChange={() => setSelectedAlternative(alternative)}
                        className="text-blue-600"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reasoning */}
            {showDetails && suggestedFix.reasoning && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Why this helps:</strong> {suggestedFix.reasoning}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-sm">Generating fix suggestions...</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            onClick={handleApplyFix}
            disabled={!selectedAlternative || isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Apply Fix
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowFalsePositiveForm(!showFalsePositiveForm)}
            size="sm"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Mark as False Positive
          </Button>
          
          {suggestedFix?.policyReference && (
            <Button
              variant="outline"
              onClick={() => onLearnMore(suggestedFix.policyReference!.section)}
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Learn More
            </Button>
          )}
        </div>

        {/* False Positive Form */}
        {showFalsePositiveForm && (
          <div className="border-t pt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Why is this a false positive?
              </label>
              <textarea
                value={falsePositiveReason}
                onChange={(e) => setFalsePositiveReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                rows={2}
                placeholder="e.g., This is a legitimate business name, not a trademark violation"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleMarkFalsePositive}
                disabled={!falsePositiveReason.trim()}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Submit
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowFalsePositiveForm(false);
                  setFalsePositiveReason('');
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Policy Reference */}
        {showDetails && suggestedFix?.policyReference && (
          <div className="border-t pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-xs">
                  <div className="font-medium text-blue-800 mb-1">
                    Related Policy: {suggestedFix.policyReference.section}
                  </div>
                  <div className="text-blue-700">
                    {suggestedFix.policyReference.why}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SuggestedFix;