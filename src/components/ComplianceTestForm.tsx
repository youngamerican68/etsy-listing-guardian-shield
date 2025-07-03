import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { analyzeDatabaseCompliance } from '@/utils/databaseComplianceAnalyzer';
import { generateComplianceProof, type ComplianceProof } from '@/services/complianceProofService';
import { CheckCircle, AlertTriangle, XCircle, Download, Share } from 'lucide-react';

interface ComplianceResult {
  status: 'pass' | 'warning' | 'fail';
  flaggedTerms: string[];
  suggestions: string[];
  confidence: number;
}

const ComplianceTestForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [proof, setProof] = useState<ComplianceProof | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and description",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const complianceResult = await analyzeDatabaseCompliance(title, description);
      setResult({
        status: complianceResult.status,
        flaggedTerms: complianceResult.flaggedTerms,
        suggestions: complianceResult.suggestions,
        confidence: complianceResult.confidence
      });

      toast({
        title: "Analysis Complete",
        description: `Compliance check completed with ${complianceResult.status} status`,
      });
    } catch (error) {
      console.error('Error analyzing compliance:', error);
      toast({
        title: "Error",
        description: "Failed to analyze compliance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateProof = async () => {
    if (!result || result.status !== 'pass') {
      toast({
        title: "Error",
        description: "Can only generate proof for passed compliance checks",
        variant: "destructive",
      });
      return;
    }

    try {
      const mockListingCheck = {
        id: `test-${Date.now()}`,
        title,
        description,
        status: result.status,
        createdAt: new Date().toISOString(),
        flaggedTerms: result.flaggedTerms,
        suggestions: result.suggestions
      };

      const generatedProof = await generateComplianceProof(mockListingCheck);
      setProof(generatedProof);

      toast({
        title: "Proof Generated",
        description: "Compliance proof has been generated successfully",
      });
    } catch (error) {
      console.error('Error generating proof:', error);
      toast({
        title: "Error",
        description: "Failed to generate compliance proof",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'fail': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Compliance Checking</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Listing Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your listing title..."
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Listing Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter your listing description..."
                rows={4}
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Analyzing...' : 'Check Compliance'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {getStatusIcon(result.status)}
              <CardTitle>Compliance Result</CardTitle>
              <Badge className={getStatusColor(result.status)}>
                {result.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Confidence: {Math.round(result.confidence * 100)}%
              </p>
            </div>

            {result.flaggedTerms.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Flagged Terms:</h4>
                <div className="flex flex-wrap gap-2">
                  {result.flaggedTerms.map((term, index) => (
                    <Badge key={index} variant="destructive" className="text-xs">
                      {term}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.suggestions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Suggestions:</h4>
                <ul className="text-sm space-y-1">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index} className="text-gray-700">• {suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.status === 'pass' && (
              <div className="flex justify-end">
                <Button onClick={handleGenerateProof} disabled={!!proof}>
                  <Download className="w-4 h-4 mr-2" />
                  {proof ? 'Proof Generated' : 'Generate Proof'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {proof && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700">Compliance Proof Generated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Certificate ID: <code className="text-xs bg-gray-100 px-1 rounded">{proof.publicToken}</code>
              </p>
              <p className="text-sm text-gray-600">
                Generated: {new Date(proof.generatedAt).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                Expires: {new Date(proof.expiresAt).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(`/proof/${proof.publicToken}`, '_blank')}
              >
                <Share className="w-4 h-4 mr-2" />
                View Certificate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComplianceTestForm;