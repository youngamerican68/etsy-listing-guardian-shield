
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface CheckHistoryListProps {
  checkHistory: ListingCheck[];
  userTier: 'free' | 'pro';
  isGeneratingProof: boolean;
  onGenerateProof: (check: ListingCheck) => void;
}

const CheckHistoryList = ({ checkHistory, userTier, isGeneratingProof, onGenerateProof }: CheckHistoryListProps) => {
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
    <Card>
      <CardHeader>
        <CardTitle>Recent Policy Compliance Checks</CardTitle>
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
                  {getStatusIconComponent(check.status)}
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
                    onClick={() => onGenerateProof(check)}
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
  );
};

export default CheckHistoryList;
