// Simple connection test component
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ConnectionTest = () => {
  const [status, setStatus] = useState('Testing...');
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      console.log('Testing Supabase connection...');
      
      // Simple health check
      const { data, error } = await supabase
        .from('compliance_rules')
        .select('count')
        .limit(1);
        
      if (error) {
        setStatus(`Connection Error: ${error.message}`);
        setDetails(error);
      } else {
        setStatus('✅ Supabase Connected Successfully!');
        setDetails({ message: 'Database connection working', data });
      }
    } catch (err: any) {
      setStatus(`Connection Failed: ${err.message}`);
      setDetails(err);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Supabase Connection Test</h2>
      <p><strong>Status:</strong> {status}</p>
      {details && (
        <details>
          <summary>Details</summary>
          <pre>{JSON.stringify(details, null, 2)}</pre>
        </details>
      )}
      <button onClick={testConnection} style={{ marginTop: '10px', padding: '5px 10px' }}>
        Retry Test
      </button>
    </div>
  );
};

export default ConnectionTest;