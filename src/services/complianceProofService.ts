
import { supabase } from '@/integrations/supabase/client';
import { generateSecureToken } from '@/utils/tokenGenerator';

export interface ComplianceProof {
  id: string;
  listingCheckId: string;
  publicToken: string;
  archivedTitle: string;
  archivedDescription: string;
  complianceStatus: 'pass' | 'warning' | 'fail';
  flaggedTerms: string[];
  suggestions: string[];
  generatedAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface ListingCheck {
  id: string;
  title: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  createdAt: string;
  flaggedTerms: string[];
  suggestions: string[];
}

export const generateComplianceProof = async (listingCheck: ListingCheck): Promise<ComplianceProof> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User must be authenticated to generate compliance proof');
  }

  if (listingCheck.status !== 'pass') {
    throw new Error('Only passed compliance checks can generate certificates');
  }

  const publicToken = generateSecureToken();
  
  const { data, error } = await supabase
    .from('compliance_proofs')
    .insert({
      user_id: user.id,
      listing_check_id: listingCheck.id,
      public_token: publicToken,
      archived_title: listingCheck.title,
      archived_description: listingCheck.description,
      compliance_status: listingCheck.status,
      flagged_terms: listingCheck.flaggedTerms,
      suggestions: listingCheck.suggestions
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating compliance proof:', error);
    throw new Error('Failed to generate compliance certificate');
  }

  return {
    id: data.id,
    listingCheckId: data.listing_check_id,
    publicToken: data.public_token,
    archivedTitle: data.archived_title,
    archivedDescription: data.archived_description,
    complianceStatus: data.compliance_status as 'pass' | 'warning' | 'fail',
    flaggedTerms: data.flagged_terms || [],
    suggestions: data.suggestions || [],
    generatedAt: data.generated_at,
    expiresAt: data.expires_at,
    isActive: data.is_active
  };
};

export const getComplianceProofByToken = async (token: string): Promise<ComplianceProof | null> => {
  const { data, error } = await supabase
    .from('compliance_proofs')
    .select('*')
    .eq('public_token', token)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    console.error('Error fetching compliance proof:', error);
    return null;
  }

  return {
    id: data.id,
    listingCheckId: data.listing_check_id,
    publicToken: data.public_token,
    archivedTitle: data.archived_title,
    archivedDescription: data.archived_description,
    complianceStatus: data.compliance_status as 'pass' | 'warning' | 'fail',
    flaggedTerms: data.flagged_terms || [],
    suggestions: data.suggestions || [],
    generatedAt: data.generated_at,
    expiresAt: data.expires_at,
    isActive: data.is_active
  };
};

export const getUserComplianceProofs = async (): Promise<ComplianceProof[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('compliance_proofs')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user compliance proofs:', error);
    return [];
  }

  return data.map(item => ({
    id: item.id,
    listingCheckId: item.listing_check_id,
    publicToken: item.public_token,
    archivedTitle: item.archived_title,
    archivedDescription: item.archived_description,
    complianceStatus: item.compliance_status as 'pass' | 'warning' | 'fail',
    flaggedTerms: item.flagged_terms || [],
    suggestions: item.suggestions || [],
    generatedAt: item.generated_at,
    expiresAt: item.expires_at,
    isActive: item.is_active
  }));
};
