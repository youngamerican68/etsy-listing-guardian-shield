
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  userTier: 'free' | 'pro';
  onUpgrade: () => void;
}

const DashboardHeader = ({ userTier, onUpgrade }: DashboardHeaderProps) => {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Your Listing Shield Dashboard
      </h1>
      <div className="flex items-center justify-between">
        <p className="text-gray-600">
          {userTier === 'free' ? 'Free Tier - 5 checks per month' : 'Pro Tier - Unlimited checks'}
        </p>
        {userTier === 'free' && (
          <Button onClick={onUpgrade} className="bg-trust-600 hover:bg-trust-700">
            Upgrade to Pro
          </Button>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;
