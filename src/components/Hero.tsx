
import { Button } from "@/components/ui/button";

interface HeroProps {
  onGetStartedClick?: () => void;
}

const Hero = ({ onGetStartedClick }: HeroProps) => {
  return (
    <div className="relative bg-gradient-to-br from-trust-50 via-white to-trust-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Protect Your Etsy Listings
              <span className="block text-trust-600 mt-2">Before You Publish</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Our AI-powered compliance checker scans your Etsy listings for trademark violations, 
              policy issues, and IP risks—helping you avoid costly takedowns and account suspensions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button 
                size="lg" 
                className="bg-trust-600 hover:bg-trust-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={onGetStartedClick}
              >
                Install Free Chrome Extension
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-trust-200 text-trust-700 hover:bg-trust-50 px-8 py-4 text-lg"
                onClick={onGetStartedClick}
              >
                Try Web Dashboard
              </Button>
            </div>

            <div className="flex justify-center items-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                Free Forever Plan
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                No Credit Card Required
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                Instant Results
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-trust-200 rounded-full opacity-20 animate-pulse-gentle"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-trust-300 rounded-full opacity-20 animate-pulse-gentle" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
};

export default Hero;
