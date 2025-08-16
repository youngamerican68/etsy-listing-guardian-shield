import React from 'react';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface SectionStatus {
  name: string;
  status: 'pass' | 'warning' | 'fail';
  issueCount: number;
}

interface ComplianceMeterProps {
  overallStatus: 'pass' | 'fail';
  sectionBreakdown: SectionStatus[];
  totalIssues: number;
  riskAssessment: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const ComplianceMeter: React.FC<ComplianceMeterProps> = ({
  overallStatus,
  sectionBreakdown,
  totalIssues,
  riskAssessment
}) => {

  const getStatusIcon = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'warning':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'fail':
        return 'text-red-700 bg-red-50 border-red-200';
    }
  };

  return (
    <Card className={`border-t-4 ${
      overallStatus === 'pass' 
        ? 'border-t-green-500 bg-gradient-to-br from-green-50 to-emerald-50' 
        : 'border-t-red-500 bg-gradient-to-br from-red-50 to-red-100'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-lg font-semibold mb-1 ${
              overallStatus === 'pass' ? 'text-green-900' : 'text-red-900'
            }`}>
              Compliance Status
            </h3>
            <p className="text-sm text-gray-600">
              {totalIssues === 0 
                ? "Perfect! No policy violations detected." 
                : `${totalIssues} issue${totalIssues === 1 ? '' : 's'} found that must be fixed.`
              }
            </p>
          </div>
          
          {/* Simple Pass/Fail Status */}
          <div className={`flex items-center gap-3 px-6 py-4 rounded-full text-lg font-bold ${
            overallStatus === 'pass' 
              ? 'bg-green-100 text-green-800 border-2 border-green-300' 
              : 'bg-red-100 text-red-800 border-2 border-red-300'
          }`}>
            {overallStatus === 'pass' ? (
              <>
                <CheckCircle className="h-6 w-6" />
                <span>COMPLIANT</span>
              </>
            ) : (
              <>
                <XCircle className="h-6 w-6" />
                <span>NEEDS FIXES</span>
              </>
            )}
          </div>
        </div>

        {/* Risk Breakdown */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">
              {riskAssessment.critical}
            </div>
            <div className="text-xs text-gray-600">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-500">
              {riskAssessment.high}
            </div>
            <div className="text-xs text-gray-600">High</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-500">
              {riskAssessment.medium}
            </div>
            <div className="text-xs text-gray-600">Medium</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-500">
              {riskAssessment.low}
            </div>
            <div className="text-xs text-gray-600">Low</div>
          </div>
        </div>

        {/* Section Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Section Status
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {sectionBreakdown.map((section) => (
              <div
                key={section.name}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm ${getStatusColor(section.status)}`}
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(section.status)}
                  <span className="font-medium">{section.name}</span>
                </div>
                {section.issueCount > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {section.issueCount}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Status Interpretation */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              overallStatus === 'pass' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium text-gray-700">
              {overallStatus === 'pass' 
                ? "Ready to publish! No policy violations detected." 
                : "Cannot publish until all violations are fixed."
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComplianceMeter;