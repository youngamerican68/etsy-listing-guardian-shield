import React from 'react';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { CheckCircle, Star, Award, Target, Heart, Sparkles } from 'lucide-react';

interface SectionStatus {
  name: string;
  status: 'pass' | 'warning' | 'fail';
  issueCount: number;
  content: string;
}

interface SuccessIndicatorsProps {
  cleanSections: SectionStatus[];
  complianceScore: number;
  totalIssuesFixed?: number;
  showCelebration?: boolean;
}

const SuccessIndicators: React.FC<SuccessIndicatorsProps> = ({
  cleanSections,
  complianceScore,
  totalIssuesFixed = 0,
  showCelebration = false
}) => {
  if (cleanSections.length === 0 && complianceScore < 75) {
    return null;
  }

  const getEncouragingMessage = () => {
    if (complianceScore === 100) {
      return "🎉 Perfect! Your listing is fully compliant!";
    } else if (complianceScore >= 90) {
      return "⭐ Excellent work! You're almost at perfect compliance!";
    } else if (complianceScore >= 75) {
      return "✨ Great job! Your listing looks professional and policy-compliant!";
    } else if (cleanSections.length > 0) {
      return "👍 Good progress! Some sections are looking great!";
    }
    return "🚀 Keep going! Every improvement counts!";
  };

  const getSectionMessage = (section: SectionStatus) => {
    const messages = {
      'Title': [
        "Great title! It's clear and policy-compliant! 📝",
        "Your title follows Etsy's guidelines perfectly! ✅",
        "Excellent title choice - buyers will love it! 🎯"
      ],
      'Description': [
        "Wonderful description! No policy concerns detected! 📖",
        "Your description is detailed and compliant! 💫",
        "Perfect description - informative and clean! ✨"
      ],
      'Tags': [
        "Great job on your tags! They're policy-friendly! 🏷️",
        "Your tags are perfect for discoverability! 🔍",
        "Excellent tag choices - all compliant! 🎪"
      ],
      'Category': [
        "Category selection looks perfect! 📂",
        "Great category choice! 📋",
        "Perfect fit for your category! 🎯"
      ],
      'Price': [
        "Pricing looks good! 💰",
        "No issues with your price! 💵",
        "Price is set correctly! 📊"
      ]
    };

    const sectionMessages = messages[section.name as keyof typeof messages] || [
      "This section looks great! ✅"
    ];
    
    return sectionMessages[Math.floor(Math.random() * sectionMessages.length)];
  };

  const getScoreBonus = () => {
    if (complianceScore === 100) return "Perfect Score! 🏆";
    if (complianceScore >= 90) return "Excellent! 🌟";
    if (complianceScore >= 80) return "Great Work! 💎";
    if (complianceScore >= 75) return "Well Done! 🎯";
    return null;
  };

  return (
    <Card className="border-t-4 border-t-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardContent className="p-6">
        {/* Main Success Message */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            {showCelebration ? (
              <Sparkles className="h-8 w-8 text-green-600 animate-pulse" />
            ) : complianceScore === 100 ? (
              <Award className="h-8 w-8 text-green-600" />
            ) : complianceScore >= 90 ? (
              <Star className="h-8 w-8 text-green-600" />
            ) : (
              <CheckCircle className="h-8 w-8 text-green-600" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            {getEncouragingMessage()}
          </h3>
          
          {getScoreBonus() && (
            <Badge className="bg-green-600 text-white mb-2">
              <Target className="h-3 w-3 mr-1" />
              {getScoreBonus()}
            </Badge>
          )}
          
          {totalIssuesFixed > 0 && (
            <p className="text-sm text-green-700">
              🎯 You've fixed {totalIssuesFixed} issue{totalIssuesFixed === 1 ? '' : 's'}!
            </p>
          )}
        </div>


        {/* Motivation Section */}
        {complianceScore >= 75 && (
          <div className="mt-6 pt-4 border-t border-green-200">
            <div className="bg-green-100 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">
                  Ready to Publish!
                </span>
                <Sparkles className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm text-green-700">
                Your listing meets Etsy's policy requirements and is ready for the marketplace!
              </p>
            </div>
          </div>
        )}

        {/* Progress Encouragement */}
        {complianceScore < 75 && cleanSections.length > 0 && (
          <div className="mt-6 pt-4 border-t border-green-200">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  Keep Going!
                </span>
              </div>
              <p className="text-xs text-green-600">
                You're making great progress. Fix the remaining issues to reach full compliance!
              </p>
            </div>
          </div>
        )}

        {/* Celebration Animation */}
        {showCelebration && complianceScore === 100 && (
          <div className="absolute -top-2 -right-2">
            <div className="animate-bounce">
              <Award className="h-6 w-6 text-yellow-500" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SuccessIndicators;