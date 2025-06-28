
import { useState } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import LoginModal from "@/components/LoginModal";
import Dashboard from "@/components/Dashboard";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userTier, setUserTier] = useState<'free' | 'pro'>('free');
  const [showDashboard, setShowDashboard] = useState(false);

  const handleLogin = async (email: string, password: string) => {
    console.log("Login attempt:", { email, password });
    
    // Mock login logic
    if (email && password) {
      setIsLoggedIn(true);
      setIsLoginModalOpen(false);
      setShowDashboard(true);
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in to Listing Shield.",
      });
    } else {
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignup = async (email: string, password: string) => {
    console.log("Signup attempt:", { email, password });
    
    // Mock signup logic
    if (email && password) {
      setIsLoggedIn(true);
      setIsLoginModalOpen(false);
      setShowDashboard(true);
      setUserTier('free');
      toast({
        title: "Account created!",
        description: "Welcome to Listing Shield. Your free account is ready to use.",
      });
    } else {
      toast({
        title: "Signup failed",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowDashboard(false);
    setUserTier('free');
    toast({
      title: "Signed out",
      description: "You've been successfully signed out.",
    });
  };

  const handleGetStarted = () => {
    if (isLoggedIn) {
      setShowDashboard(true);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleSelectPlan = (plan: string) => {
    if (!isLoggedIn) {
      setIsLoginModalOpen(true);
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

  if (showDashboard && isLoggedIn) {
    return (
      <>
        <Header 
          isLoggedIn={isLoggedIn}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onDashboardClick={() => setShowDashboard(true)}
          onLogoutClick={handleLogout}
        />
        <Dashboard 
          userTier={userTier}
          onUpgrade={handleUpgrade}
        />
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={handleLogin}
          onSignup={handleSignup}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header 
        isLoggedIn={isLoggedIn}
        onLoginClick={() => setIsLoginModalOpen(true)}
        onDashboardClick={() => setShowDashboard(true)}
        onLogoutClick={handleLogout}
      />
      
      <Hero onGetStartedClick={handleGetStarted} />
      <Features />
      <Pricing onSelectPlan={handleSelectPlan} />
      <Footer />

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
        onSignup={handleSignup}
      />
    </div>
  );
};

export default Index;
