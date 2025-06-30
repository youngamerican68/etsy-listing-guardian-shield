// In src/components/Header.tsx

'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const Header = () => {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-trust-600">
              Listing Shield
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/features" className="text-gray-600 hover:text-gray-900">Features</Link>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
            <Link href="/about" className="text-gray-600 hover:text-gray-900">About</Link>
          </div>
          <div className="flex items-center">
            {/* --- THIS IS THE KEY LOGIC --- */}
            {loading ? (
              // While loading, show a placeholder to prevent flashing
              <div className="w-24 h-10 bg-gray-200 rounded-md animate-pulse"></div>
            ) : user ? (
              // If user is logged in, show Dashboard and Logout
              <>
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 mr-4">Dashboard</Link>
                <Button onClick={signOut} variant="outline">Logout</Button>
              </>
            ) : (
              // If user is logged out, show Login
              <Link href="/login">
                <Button>Login</Button>
              </Link>
            )}
            {/* --- END OF KEY LOGIC --- */}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
