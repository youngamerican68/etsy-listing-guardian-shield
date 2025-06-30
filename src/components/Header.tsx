'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom'; // <-- CORRECTED IMPORT
import { Button } from '@/components/ui/button';

const Header = () => {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-trust-600">
              Listing Shield
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/features" className="text-gray-600 hover:text-gray-900">Features</Link>
            <Link to="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
            <Link to="/about" className="text-gray-600 hover:text-gray-900">About</Link>
          </div>
          <div className="flex items-center">
            {loading ? (
              <div className="w-24 h-10 bg-gray-200 rounded-md animate-pulse"></div>
            ) : user ? (
              <>
                <Link to="/dashboard" className="text-gray-600 hover:text-gray-900 mr-4">Dashboard</Link>
                <Button onClick={signOut} variant="outline">Logout</Button>
              </>
            ) : (
              <Link to="/login">
                <Button>Login</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;