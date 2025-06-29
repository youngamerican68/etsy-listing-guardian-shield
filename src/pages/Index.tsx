
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import Dashboard from "@/components/Dashboard";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const [showDashboard, setShowDashboard] = useState(false);
  const [userTier, setUserTier] = useState<'free' | 'pro'>('free');

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const handleLogout = async () => {
    await signOut();
    setShowDashboard(false);
    setUserTier('free');
    toast({
      title: "Signed out",
      description: "You've been successfully signed out.",
    });
  };

  const handleGetStarted = () => {
    if (user) {
      setShowDashboard(true);
    } else {
      // Redirect to auth page
      window.location.href = '/auth';
    }
  };

  const handleSelectPlan = (plan: string) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    
    if (plan === 'pro') {
      // Mock upgrade
      setUserTier('pro');
      toast({
        title: "Upgraded to Pro!",
        description: "You now have unlimited listing checks and premium features.",
      });
    }
  };

  const handleUpgrade = () => {
    handleSelectPlan('pro');
  };

  if (showDashboard && user) {
    return (
      <>
        <Header 
          isLoggedIn={!!user}
          onLoginClick={() => window.location.href = '/auth'}
          onDashboardClick={() => setShowDashboard(true)}
          onLogoutClick={handleLogout}
        />
        <Dashboard 
          userTier={userTier}
          onUpgrade={handleUpgrade}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header 
        isLoggedIn={!!user}
        onLoginClick={() => window.location.href = '/auth'}
        onDashboardClick={() => setShowDashboard(true)}
        onLogoutClick={handleLogout}
      />
      
      <Hero onGetStartedClick={handleGetStarted} />
      <Features />
      <Pricing onSelectPlan={handleSelectPlan} />
      <Footer />
    </div>
  );
};

export default Index;
