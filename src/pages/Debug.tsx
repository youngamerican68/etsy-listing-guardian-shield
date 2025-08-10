// Simple debug page to test connectivity
import React from 'react';
import ConnectionTest from '@/components/debug/ConnectionTest';

const Debug = () => {
  return (
    <div>
      <h1>Debug Page</h1>
      <p>If you can see this, the React app is loading correctly.</p>
      <ConnectionTest />
    </div>
  );
};

export default Debug;