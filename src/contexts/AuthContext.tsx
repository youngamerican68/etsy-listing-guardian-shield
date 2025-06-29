'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
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
  // We no longer need to expose signIn/signUp from here
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // This useEffect now ONLY handles the initial load.
  useEffect(() => {
    async function getInitialSession() {
      console.log("AuthProvider: Getting initial session...");
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        console.log("AuthProvider: User found in initial session. Fetching profile.");
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', session.user.id)
          .single();
        
        setUser(session.user);
        setProfile(profileData as Profile);
        console.log("AuthProvider: Initial profile loaded:", profileData);
      }
      
      console.log("AuthProvider: Initial load complete. Setting loading to false.");
      setLoading(false);
    }

    getInitialSession();

    // This listener now ONLY handles changes AFTER the initial load.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          setUser(session?.user ?? null);
          // The profile will be fetched on the next page load/reload.
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin'
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
