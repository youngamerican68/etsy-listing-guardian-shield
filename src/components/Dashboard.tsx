
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ComplianceCheckForm from "@/components/dashboard/ComplianceCheckForm";
import ComplianceResult from "@/components/dashboard/ComplianceResult";
import CheckHistoryList from "@/components/dashboard/CheckHistoryList";
import ComplianceProofDialog from "@/components/dashboard/ComplianceProofDialog";

interface ListingCheck {
  id: string;
  title: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  createdAt: string;
  flaggedTerms: string[];
  suggestions: string[];
}

interface ComplianceProof {
  id: string;
  listingCheckId: string;
  publicToken: string;
  archivedTitle: string;
  archivedDescription: string;
  generatedAt: string;
}

interface DashboardProps {
  userTier: 'free' | 'pro';
  onUpgrade: () => void;
}

const Dashboard = ({ userTier, onUpgrade }: DashboardProps) => {
  const [currentResult, setCurrentResult] = useState<ListingCheck | null>(null);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [currentProof, setCurrentProof] = useState<ComplianceProof | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  // Mock data for listing history
  const [checkHistory] = useState<ListingCheck[]>([
    {
      id: "1",
      title: "Handmade Sterling Silver Earrings",
      description: "Beautiful handcrafted earrings made with genuine sterling silver...",
      status: "pass",
      createdAt: "2024-01-15T10:30:00Z",
      flaggedTerms: [],
      suggestions: []
    },
    {
      id: "2", 
      title: "Disney-Inspired Princess Dress",
      description: "Perfect dress for your little princess, Disney-style design...",
      status: "fail",
      createdAt: "2024-01-14T15:45:00Z",
      flaggedTerms: ["Disney", "Princess"],
      suggestions: ["Royal-Inspired Dress", "Fairy Tale Costume", "Magic Kingdom Style Dress"]
    },
    {
      id: "3",
      title: "Vintage Nike-Style Sneakers",
      description: "Classic sneaker design inspired by retro athletics...",
      status: "warning",
      createdAt: "2024-01-12T09:15:00Z",
      flaggedTerms: ["Nike-Style"],
      suggestions: ["Vintage Athletic Sneakers", "Retro Sports Shoes", "Classic Runner Design"]
    }
  ]);

  const generateComplianceProof = async (listingCheck: ListingCheck) => {
    if (userTier !== 'pro') {
      toast({
        title: "Pro Feature Required",
        description: "Upgrade to Pro to generate compliance certificates.",
        variant: "destructive",
      });
      return;
    }

    if (listingCheck.status !== 'pass') {
      toast({
        title: "Cannot Generate Proof",
        description: "Only listings that pass compliance checks can generate certificates.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingProof(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const publicToken = `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const proof: ComplianceProof = {
        id: Date.now().toString(),
        listingCheckId: listingCheck.id,
        publicToken,
        archivedTitle: listingCheck.title,
        archivedDescription: listingCheck.description,
        generatedAt: new Date().toISOString()
      };

      setCurrentProof(proof);
      setShowProofDialog(true);
      
      toast({
        title: "Compliance Certificate Generated",
        description: "Your shareable compliance proof is ready.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate compliance certificate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingProof(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <DashboardHeader userTier={userTier} onUpgrade={onUpgrade} />
        
        <ComplianceCheckForm onCheckComplete={setCurrentResult} />

        {currentResult && (
          <ComplianceResult 
            result={currentResult}
            userTier={userTier}
            isGeneratingProof={isGeneratingProof}
            onGenerateProof={generateComplianceProof}
          />
        )}

        <CheckHistoryList 
          checkHistory={checkHistory}
          userTier={userTier}
          isGeneratingProof={isGeneratingProof}
          onGenerateProof={generateComplianceProof}
        />

        <ComplianceProofDialog 
          isOpen={showProofDialog}
          onOpenChange={setShowProofDialog}
          proof={currentProof}
        />
      </div>
    </div>
  );
};

export default Dashboard;
