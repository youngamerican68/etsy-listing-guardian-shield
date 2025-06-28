
/**
 * Secure token generator for compliance proofs
 * Uses cryptographically secure random values
 */
export const generateSecureToken = (): string => {
  // Use crypto.getRandomValues for cryptographically secure randomness
  const array = new Uint8Array(32); // 256 bits of entropy
  crypto.getRandomValues(array);
  
  // Convert to base64url (URL-safe, no padding)
  const base64 = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
    
  return `proof_${Date.now()}_${base64}`;
};
