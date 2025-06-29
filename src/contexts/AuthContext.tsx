
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthProvider: Starting up...");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`AuthProvider: Auth event fired: ${event}`);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          try {
            const { data: profileData, error } = await supabase
              .from('profiles')
              .select('id, role')
              .eq('id', currentUser.id)
              .single();
            
            if (error) throw error; // Jump to catch block if there's an error
            
            setProfile(profileData as Profile);
            console.log("AuthProvider: Profile loaded successfully:", profileData);
          } catch (error) {
            console.error("AuthProvider: CRITICAL ERROR fetching profile:", error);
            setProfile(null);
          } finally {
            console.log("AuthProvider: All tasks finished. Setting loading to false.");
            setLoading(false);
          }
        } else {
          setProfile(null);
          console.log("AuthProvider: No user. Setting loading to false.");
          setLoading(false);
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
