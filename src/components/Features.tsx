
const Features = () => {
  const features = [
    {
      icon: "🛡️",
      title: "Trademark Protection",
      description: "Instantly detect potential trademark violations from major brands like Nike, Disney, and thousands more."
    },
    {
      icon: "⚡",
      title: "Real-time Analysis",
      description: "Get compliance results in seconds with our lightning-fast AI-powered scanning engine."
    },
    {
      icon: "🎯",
      title: "Smart Suggestions",
      description: "Receive alternative phrasing recommendations to make your listings compliant while maintaining appeal."
    },
    {
      icon: "📊",
      title: "Compliance History",
      description: "Track all your listing checks with detailed results and generate compliance certificates."
    },
    {
      icon: "🔒",
      title: "Privacy First",
      description: "Your listing data is encrypted and automatically deleted after 90 days for maximum privacy."
    },
    {
      icon: "⚖️",
      title: "Policy Expert",
      description: "Stay updated with the latest Etsy policies and marketplace regulations automatically."
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Stay Compliant
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Comprehensive protection tools designed specifically for Etsy sellers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-xl border border-gray-200 hover:border-trust-300 transition-all duration-300 hover:shadow-lg group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
