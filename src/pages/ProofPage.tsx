
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, Calendar, FileText, AlertTriangle, XCircle } from "lucide-react";
import { getComplianceProofByToken, type ComplianceProof } from "@/services/complianceProofService";

const ProofPage = () => {
  const { token } = useParams<{ token: string }>();
  const [proof, setProof] = useState<ComplianceProof | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProof = async () => {
      if (!token) {
        setError("Invalid certificate token");
        setLoading(false);
        return;
      }

      try {
        const proofData = await getComplianceProofByToken(token);
        if (proofData) {
          setProof(proofData);
        } else {
          setError("Certificate not found or expired");
        }
      } catch (err) {
        console.error('Error fetching proof:', err);
        setError("Failed to load certificate");
      } finally {
        setLoading(false);
      }
    };

    fetchProof();
  }, [token]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-success-100 text-success-800 border-success-200';
      case 'warning': return 'bg-warning-100 text-warning-800 border-warning-200';
      case 'fail': return 'bg-danger-100 text-danger-800 border-danger-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-6 h-6 text-success-600" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-warning-600" />;
      case 'fail': return <XCircle className="w-6 h-6 text-danger-600" />;
      default: return <CheckCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pass': return 'PASSED';
      case 'warning': return 'WARNING';
      case 'fail': return 'FAILED';
      default: return 'UNKNOWN';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trust-600 mx-auto mb-4"></div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Loading Certificate...
            </h1>
            <p className="text-gray-600">
              Please wait while we verify your compliance certificate.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !proof) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="py-12">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Compliance Certificate Not Found
            </h1>
            <p className="text-gray-600">
              {error || "The compliance certificate you're looking for doesn't exist or may have expired."}
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
              {getStatusIcon(proof.complianceStatus)}
              <CardTitle className={proof.complianceStatus === 'pass' ? 'text-success-700' : proof.complianceStatus === 'warning' ? 'text-warning-700' : 'text-danger-700'}>
                Compliance {proof.complianceStatus === 'pass' ? 'Verified' : proof.complianceStatus === 'warning' ? 'Warning' : 'Failed'}
              </CardTitle>
              <Badge className={getStatusColor(proof.complianceStatus)}>
                {getStatusText(proof.complianceStatus)}
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
                    {proof.archivedTitle}
                  </h4>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {proof.archivedDescription}
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
                      {proof.publicToken}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Verified On</p>
                    <p className="text-sm text-gray-900">
                      {new Date(proof.generatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                      })}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Expires On</p>
                    <p className="text-sm text-gray-900">
                      {new Date(proof.expiresAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compliance Summary */}
              <div className={`border p-6 rounded-lg ${
                proof.complianceStatus === 'pass' 
                  ? 'bg-success-50 border-success-200' 
                  : proof.complianceStatus === 'warning'
                  ? 'bg-warning-50 border-warning-200'
                  : 'bg-danger-50 border-danger-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-2 ${
                  proof.complianceStatus === 'pass' 
                    ? 'text-success-800' 
                    : proof.complianceStatus === 'warning'
                    ? 'text-warning-800'
                    : 'text-danger-800'
                }`}>
                  Compliance Status: {getStatusText(proof.complianceStatus)}
                </h3>
                
                <p className={`text-sm mb-4 ${
                  proof.complianceStatus === 'pass' 
                    ? 'text-success-700' 
                    : proof.complianceStatus === 'warning'
                    ? 'text-warning-700'
                    : 'text-danger-700'
                }`}>
                  {proof.complianceStatus === 'pass' 
                    ? 'This listing has been analyzed and verified to comply with marketplace policies and intellectual property guidelines at the time of verification.'
                    : proof.complianceStatus === 'warning'
                    ? 'This listing has potential compliance issues that should be reviewed.'
                    : 'This listing has failed compliance checks and should not be published without corrections.'
                  }
                </p>
                
                {proof.complianceStatus === 'pass' && (
                  <div className="text-xs text-success-600">
                    <p>✓ No trademark violations detected</p>
                    <p>✓ Policy compliance verified</p>
                    <p>✓ Content authenticity confirmed</p>
                  </div>
                )}

                {proof.flaggedTerms.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-2">Flagged Terms:</p>
                    <div className="flex flex-wrap gap-2">
                      {proof.flaggedTerms.map((term, index) => (
                        <Badge key={index} variant="destructive" className="text-xs">
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
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
              listingshield.com/proof/{proof.publicToken}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProofPage;
