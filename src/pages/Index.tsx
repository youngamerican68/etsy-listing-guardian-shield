
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import ComplianceCheckForm from '@/components/dashboard/ComplianceCheckForm';
import CheckHistoryList from '@/components/dashboard/CheckHistoryList';

interface ListingCheck {
  id: string;
  title: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  createdAt: string;
  flaggedTerms: string[];
  suggestions: string[];
}

const Index = () => {
  const { user, loading } = useAuth();
  const [checks, setChecks] = useState<ListingCheck[]>([]);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  const handleCheckComplete = (result: ListingCheck) => {
    setChecks(prev => [result, ...prev]);
  };

  const handleGenerateProof = (check: ListingCheck) => {
    setIsGeneratingProof(true);
    // TODO: Implement proof generation logic
    console.log('Generating proof for check:', check);
    setTimeout(() => {
      setIsGeneratingProof(false);
    }, 2000);
  };

  const scrollToChecker = () => {
    const element = document.getElementById('compliance-checker');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <Hero onGetStartedClick={scrollToChecker} />
      
      {/* Features Section */}
      <Features />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {user ? (
          // Authenticated user sees the full compliance checking interface
          <div id="compliance-checker" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Check Your Listing Compliance
              </h2>
              <p className="text-lg text-gray-600">
                Enter your Etsy listing details below to check for compliance issues
              </p>
            </div>

            <ComplianceCheckForm onCheckComplete={handleCheckComplete} />
            
            {checks.length > 0 && (
              <div className="mt-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  Recent Checks
                </h3>
                <CheckHistoryList 
                  checkHistory={checks}
                  userTier="free"
                  isGeneratingProof={isGeneratingProof}
                  onGenerateProof={handleGenerateProof}
                />
              </div>
            )}

            {/* Admin Link for authenticated users */}
            <div className="text-center mt-12">
              <Link to="/admin">
                <Button variant="outline">
                  Admin Dashboard
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          // Non-authenticated users see a preview and login prompt
          <div id="compliance-checker" className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Ready to Check Your Listings?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Sign up for free to start checking your Etsy listings for compliance issues
              </p>
            </div>

            <Card className="max-w-2xl mx-auto">
              <CardContent className="p-12 text-center">
                <div className="space-y-6">
                  <div className="text-6xl mb-4">🛡️</div>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    Get Started in Seconds
                  </h3>
                  <p className="text-gray-600">
                    Create your free account to access the compliance checker and protect your listings from takedowns.
                  </p>
                  <div className="space-y-3">
                    <Link to="/auth">
                      <Button size="lg" className="w-full">
                        Sign Up Free - No Credit Card Required
                      </Button>
                    </Link>
                    <Link to="/test-compliance">
                      <Button variant="outline" size="lg" className="w-full">
                        Try Test Version (Limited Features)
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature highlights for non-authenticated users */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-3">⚡</div>
                  <h4 className="font-semibold mb-2">Instant Results</h4>
                  <p className="text-sm text-gray-600">Get compliance results in seconds</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-3">🎯</div>
                  <h4 className="font-semibold mb-2">Smart Suggestions</h4>
                  <p className="text-sm text-gray-600">Receive actionable recommendations</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-3">📊</div>
                  <h4 className="font-semibold mb-2">Track History</h4>
                  <p className="text-sm text-gray-600">Monitor all your compliance checks</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
