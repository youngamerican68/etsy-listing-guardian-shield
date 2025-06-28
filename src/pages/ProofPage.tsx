
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, Calendar, FileText } from "lucide-react";

interface ComplianceProof {
  id: string;
  publicToken: string;
  archivedTitle: string;
  archivedDescription: string;
  generatedAt: string;
  status: 'verified';
}

const ProofPage = () => {
  const { token } = useParams<{ token: string }>();
  
  // Mock proof data - in real implementation, this would fetch from backend
  const mockProof: ComplianceProof | null = token ? {
    id: "1",
    publicToken: token,
    archivedTitle: "Handmade Sterling Silver Earrings",
    archivedDescription: "Beautiful handcrafted earrings made with genuine sterling silver, featuring delicate butterfly designs. Each pair is individually crafted in our workshop using traditional techniques passed down through generations.",
    generatedAt: "2024-01-15T10:30:00Z",
    status: "verified"
  } : null;

  if (!mockProof) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="py-12">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Compliance Certificate Not Found
            </h1>
            <p className="text-gray-600">
              The compliance certificate you're looking for doesn't exist or may have expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-trust-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">
              Listing Shield
            </h1>
          </div>
          <h2 className="text-xl text-gray-600">
            Compliance Certificate
          </h2>
        </div>

        {/* Certificate Card */}
        <Card className="mb-8 border-2 border-trust-200">
          <CardHeader className="bg-trust-50 border-b border-trust-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-success-600" />
              <CardTitle className="text-success-700">
                Compliance Verified
              </CardTitle>
              <Badge className="bg-success-100 text-success-800 border-success-200">
                PASSED
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Listing Details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Verified Listing
                  </h3>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {mockProof.archivedTitle}
                  </h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {mockProof.archivedDescription}
                  </p>
                </div>
              </div>

              {/* Verification Details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Verification Details
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Certificate ID</p>
                    <p className="font-mono text-sm text-gray-900 break-all">
                      {mockProof.publicToken}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Verified On</p>
                    <p className="text-sm text-gray-900">
                      {new Date(mockProof.generatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compliance Summary */}
              <div className="bg-success-50 border border-success-200 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-success-800 mb-2">
                  Compliance Status: PASSED
                </h3>
                <p className="text-success-700 text-sm">
                  This listing has been analyzed and verified to comply with marketplace policies and intellectual property guidelines at the time of verification.
                </p>
                
                <div className="mt-4 text-xs text-success-600">
                  <p>✓ No trademark violations detected</p>
                  <p>✓ Policy compliance verified</p>
                  <p>✓ Content authenticity confirmed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p className="mb-2">
            This certificate was generated by Listing Shield, an AI-powered compliance verification service.
          </p>
          <p>
            Certificate verification can be independently confirmed at{' '}
            <span className="text-trust-600 font-medium">
              listingshield.com/proof/{mockProof.publicToken}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProofPage;
