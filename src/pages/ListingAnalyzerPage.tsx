import React from 'react';
import ListingAnalyzer from '../components/ListingAnalyzer';

const ListingAnalyzerPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Etsy Listing Guardian Shield
          </h1>
          <p className="text-lg text-gray-600">
            Analyze your Etsy listings for policy compliance before you publish
          </p>
        </div>
        
        <ListingAnalyzer />
      </div>
    </div>
  );
};

export default ListingAnalyzerPage;