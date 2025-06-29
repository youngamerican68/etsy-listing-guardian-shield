
import { useAuth } from '@/contexts/AuthContext';

const AuthTestPage = () => {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) {
    return <div style={{ padding: '20px', fontFamily: 'monospace' }}>Auth is loading...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Auth Test Page</h1>
      <p>Loading Complete.</p>
      
      <h2>User:</h2>
      <pre>{user ? JSON.stringify(user, null, 2) : 'null'}</pre>
      
      <h2>Profile:</h2>
      <pre>{profile ? JSON.stringify(profile, null, 2) : 'null'}</pre>

      <h2>Is Admin?</h2>
      <pre>{isAdmin ? 'Yes' : 'No'}</pre>
    </div>
  );
};

export default AuthTestPage;
