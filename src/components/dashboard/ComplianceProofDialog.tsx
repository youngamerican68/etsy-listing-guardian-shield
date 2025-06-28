
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ComplianceProof {
  id: string;
  listingCheckId: string;
  publicToken: string;
  archivedTitle: string;
  archivedDescription: string;
  generatedAt: string;
}

interface ComplianceProofDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  proof: ComplianceProof | null;
}

const ComplianceProofDialog = ({ isOpen, onOpenChange, proof }: ComplianceProofDialogProps) => {
  const copyProofLink = () => {
    if (proof) {
      const proofUrl = `${window.location.origin}/proof/${proof.publicToken}`;
      navigator.clipboard.writeText(proofUrl);
      toast({
        title: "Link Copied",
        description: "Compliance certificate link copied to clipboard.",
      });
    }
  };

  const openProofPage = () => {
    if (proof) {
      const proofUrl = `${window.location.origin}/proof/${proof.publicToken}`;
      window.open(proofUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compliance Certificate Generated</DialogTitle>
          <DialogDescription>
            Your listing has been verified as compliant. Share this certificate with marketplaces or customers as proof of compliance.
          </DialogDescription>
        </DialogHeader>
        {proof && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Certificate Details</h4>
              <p className="text-sm text-gray-600">
                <strong>Listing:</strong> {proof.archivedTitle}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Verified:</strong> {new Date(proof.generatedAt).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Token:</strong> {proof.publicToken}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={copyProofLink} className="flex-1">
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button onClick={openProofPage} variant="outline" className="flex-1">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Certificate
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              This certificate is publicly accessible and can be shared with anyone.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ComplianceProofDialog;
