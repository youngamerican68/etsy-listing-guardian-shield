import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Use useNavigate for navigation
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import Dashboard from "@/components/Dashboard"; // Assuming this is your dashboard component
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate(); // Hook for programmatic navigation

  // This local state is for demonstrating the Pro tier, it's fine as is.
  const [userTier, setUserTier] = useState<'free' | 'pro'>('free');

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  // --- REVISED LOGIC ---
  // The logic to show the dashboard should be based on the URL, not local state.
  // We will assume that if a user is logged in, the /dashboard route shows the dashboard.
  // This Index page will now only be the main landing page.

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard'); // Navigate to the dashboard if logged in
    } else {
      navigate('/login'); // Navigate to the login page if not logged in
    }
  };

  const handleSelectPlan = (plan: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (plan === 'pro') {
      setUserTier('pro');
      toast({
        title: "Upgraded to Pro!",
        description: "You now have unlimited listing checks and premium features.",
      });
      // In a real app, this would also involve a call to Stripe and updating the user's profile.
    }
  };

  // The main return is now much simpler. It ONLY shows the landing page.
  // The Dashboard component should be rendered by its own route (e.g., at /dashboard).
  return (
    <div className="min-h-screen bg-white">
      {/* The Header is now self-sufficient, no props are needed */}
      <Header />
      
      <main>
        <Hero onGetStartedClick={handleGetStarted} />
        <Features />
        <Pricing onSelectPlan={handleSelectPlan} />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
