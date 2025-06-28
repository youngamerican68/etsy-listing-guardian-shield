
import { Button } from "@/components/ui/button";

interface PricingProps {
  onSelectPlan?: (plan: string) => void;
}

const Pricing = ({ onSelectPlan }: PricingProps) => {
  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for testing and small sellers",
      features: [
        "5 listing checks per month",
        "Basic compliance scanning",
        "Last 10 checks history",
        "Email support"
      ],
      buttonText: "Get Started Free",
      popular: false
    },
    {
      name: "Pro",
      price: "$19",
      period: "per month",
      description: "For serious Etsy sellers and shops",
      features: [
        "Unlimited listing checks",
        "Advanced AI analysis",
        "Full compliance history",
        "Compliance certificates",
        "Priority support",
        "Early access to new features"
      ],
      buttonText: "Start Pro Trial",
      popular: true
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-trust-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Start free and upgrade when you're ready to scale
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`relative bg-white rounded-2xl shadow-lg border-2 p-8 ${
                plan.popular 
                  ? 'border-trust-500 ring-4 ring-trust-100' 
                  : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-trust-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600 ml-2">/{plan.period}</span>
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <div className="w-5 h-5 bg-success-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full py-3 text-lg font-semibold ${
                  plan.popular 
                    ? 'bg-trust-600 hover:bg-trust-700 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
                onClick={() => onSelectPlan?.(plan.name.toLowerCase())}
              >
                {plan.buttonText}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600">
            All plans include a 14-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
