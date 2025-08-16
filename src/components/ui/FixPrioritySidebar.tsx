import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Checkbox } from './checkbox';
import { 
  List, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Download,
  Target
} from 'lucide-react';

interface PriorityIssue {
  id: string;
  term: string;
  category: string;
  risk_level: string;
  estimatedFixTime: string;
  priority: number;
  isCompleted?: boolean;
}

interface FixPrioritySidebarProps {
  issues: PriorityIssue[];
  onIssueComplete: (issueId: string, completed: boolean) => void;
  onExportFixList: () => void;
  className?: string;
}

const FixPrioritySidebar: React.FC<FixPrioritySidebarProps> = ({
  issues,
  onIssueComplete,
  onExportFixList,
  className = ''
}) => {
  const [completedIssues, setCompletedIssues] = useState<Set<string>>(new Set());

  const handleToggleComplete = (issueId: string) => {
    const newCompleted = new Set(completedIssues);
    const isCompleted = newCompleted.has(issueId);
    
    if (isCompleted) {
      newCompleted.delete(issueId);
    } else {
      newCompleted.add(issueId);
    }
    
    setCompletedIssues(newCompleted);
    onIssueComplete(issueId, !isCompleted);
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTotalEstimatedTime = () => {
    const incompleteIssues = issues.filter(issue => !completedIssues.has(issue.id));
    const totalMinutes = incompleteIssues.reduce((total, issue) => {
      const minutes = parseInt(issue.estimatedFixTime) || 1;
      return total + minutes;
    }, 0);
    
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
  };

  const completionPercentage = issues.length > 0 
    ? Math.round((completedIssues.size / issues.length) * 100) 
    : 0;

  // Sort issues by priority (critical first, then by estimated fix time)
  const sortedIssues = [...issues].sort((a, b) => {
    const riskPriority = { critical: 4, high: 3, medium: 2, low: 1 };
    const aPriority = riskPriority[a.risk_level as keyof typeof riskPriority] || 0;
    const bPriority = riskPriority[b.risk_level as keyof typeof riskPriority] || 0;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }
    
    // Secondary sort by estimated fix time
    const aTime = parseInt(a.estimatedFixTime) || 999;
    const bTime = parseInt(b.estimatedFixTime) || 999;
    return aTime - bTime;
  });

  if (issues.length === 0) {
    return null;
  }

  return (
    <Card className={`h-fit ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <List className="h-4 w-4 text-blue-600" />
          Fix Priority List
        </CardTitle>
        
        {/* Progress Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress:</span>
            <span className="font-medium">{completedIssues.size}/{issues.length}</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{getTotalEstimatedTime()} remaining</span>
            </div>
            <span>{completionPercentage}% complete</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {sortedIssues.map((issue, index) => {
          const isCompleted = completedIssues.has(issue.id);
          
          return (
            <div
              key={issue.id}
              className={`p-3 rounded-lg border transition-all ${
                isCompleted 
                  ? 'bg-green-50 border-green-200 opacity-75' 
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => handleToggleComplete(issue.id)}
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getRiskColor(issue.risk_level)}`}
                    >
                      {getRiskIcon(issue.risk_level)}
                      {issue.risk_level.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>
                  
                  <div className={`text-sm font-medium mb-1 ${
                    isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}>
                    "{issue.term}"
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    {issue.category}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {issue.estimatedFixTime}
                    </div>
                    {isCompleted && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
      
      <div className="p-3 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onExportFixList}
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Fix List
        </Button>
      </div>
    </Card>
  );
};

export default FixPrioritySidebar;