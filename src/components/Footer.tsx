
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold mb-4">
              <span className="bg-gradient-to-r from-trust-400 to-trust-300 bg-clip-text text-transparent">
                Listing Shield
              </span>
            </h3>
            <p className="text-gray-400 mb-4 max-w-md">
              Protecting Etsy sellers from compliance issues with AI-powered listing analysis. 
              Stay safe, stay compliant, keep selling.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-trust-400 transition-colors">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-trust-400 transition-colors">Terms</a>
              <a href="#" className="text-gray-400 hover:text-trust-400 transition-colors">Support</a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-trust-400 transition-colors">Chrome Extension</a></li>
              <li><a href="#" className="text-gray-400 hover:text-trust-400 transition-colors">Web Dashboard</a></li>
              <li><a href="#" className="text-gray-400 hover:text-trust-400 transition-colors">API Access</a></li>
              <li><a href="#" className="text-gray-400 hover:text-trust-400 transition-colors">Enterprise</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-trust-400 transition-colors">Help Center</a></li>
              <li><a href="#" className="text-gray-400 hover:text-trust-400 transition-colors">Etsy Policy Guide</a></li>
              <li><a href="#" className="text-gray-400 hover:text-trust-400 transition-colors">Compliance Tips</a></li>
              <li><a href="#" className="text-gray-400 hover:text-trust-400 transition-colors">Contact Us</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 mt-8 text-center">
          <p className="text-gray-400">
            © 2024 Listing Shield. All rights reserved. Built with care for Etsy sellers worldwide.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
