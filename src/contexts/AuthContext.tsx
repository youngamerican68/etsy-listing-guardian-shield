
'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthProvider: Starting up with Edge Function approach...");
    
    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        console.log("AuthProvider: Initial session user:", currentUser ? "Found" : "None");
        
        setUser(currentUser);
        
        if (currentUser) {
          try {
            console.log("AuthProvider: Invoking get-user-profile function...");
            // Instead of a direct DB call, we invoke the trusted Edge Function
            const { data, error } = await supabase.functions.invoke('get-user-profile');
            
            if (error) {
              console.error("AuthProvider: Edge function error:", error);
              throw error;
            }
            
            console.log("AuthProvider: Profile loaded via Edge Function:", data);
            setProfile(data);
          } catch (error) {
            console.error("AuthProvider: Error invoking get-user-profile function:", error);
            setProfile(null);
          }
        }
      } catch (error) {
        console.error("AuthProvider: Error in getInitialSession:", error);
      } finally {
        setLoading(false);
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`AuthProvider: Auth event fired: ${event}`);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
        } else if (event === 'SIGNED_IN') {
          // Reload the page on sign-in to trigger a fresh getInitialSession call
          console.log("AuthProvider: Reloading page after sign-in");
          window.location.reload();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log("AuthProvider: Attempting sign in for:", email);
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string) => {
    console.log("AuthProvider: Attempting sign up for:", email);
    return supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`
      }
    });
  };

  const signOut = async () => {
    console.log("AuthProvider: Signing out");
    await supabase.auth.signOut();
  };

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
