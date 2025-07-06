
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface HeaderProps {
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  onLoginClick?: () => void;
  onDashboardClick?: () => void;
  onLogoutClick?: () => void;
}

const Header = ({ 
  isLoggedIn = false,
  isAdmin = false,
  onLoginClick, 
  onDashboardClick, 
  onLogoutClick 
}: HeaderProps) => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-trust-700">
                <span className="bg-gradient-to-r from-trust-600 to-trust-700 bg-clip-text text-transparent">
                  Listing Shield
                </span>
              </h1>
            </div>
          </div>

          <nav className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <a href="#features" className="text-gray-600 hover:text-trust-700 px-3 py-2 text-sm font-medium transition-colors">
                Features
              </a>
              <Link to="/policies" className="text-gray-600 hover:text-trust-700 px-3 py-2 text-sm font-medium transition-colors">
                Policies
              </Link>
              <a href="#pricing" className="text-gray-600 hover:text-trust-700 px-3 py-2 text-sm font-medium transition-colors">
                Pricing
              </a>
              <a href="#about" className="text-gray-600 hover:text-trust-700 px-3 py-2 text-sm font-medium transition-colors">
                About
              </a>
              {isLoggedIn && (
                <Link to="/test-compliance" className="text-gray-600 hover:text-trust-700 px-3 py-2 text-sm font-medium transition-colors">
                  Test Compliance
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="text-gray-600 hover:text-trust-700 px-3 py-2 text-sm font-medium transition-colors">
                  Admin
                </Link>
              )}
            </div>
          </nav>

          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                <Button 
                  variant="ghost" 
                  onClick={onDashboardClick}
                  className="text-trust-700 hover:text-trust-800"
                >
                  Dashboard
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onLogoutClick}
                  className="border-trust-200 text-trust-700 hover:bg-trust-50"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={onLoginClick}
                  className="text-trust-700 hover:text-trust-800"
                >
                  Login
                </Button>
                <Button 
                  className="bg-trust-600 hover:bg-trust-700 text-white"
                  onClick={onLoginClick}
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
