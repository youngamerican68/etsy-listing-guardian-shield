import { supabase } from '@/integrations/supabase/client';

export interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  hitCount: number;
  avgConfidence: number;
}

// Clean up expired cache entries
export const cleanupExpiredCache = async (): Promise<void> => {
  try {
    const { error } = await supabase.rpc('cleanup_expired_cache');
    if (error) {
      console.error('Error cleaning up expired cache:', error);
    } else {
      console.log('Successfully cleaned up expired cache entries');
    }
  } catch (error) {
    console.error('Failed to cleanup expired cache:', error);
  }
};

// Get cache statistics
export const getCacheStats = async (): Promise<CacheStats> => {
  try {
    const { data, error } = await supabase
      .from('compliance_cache')
      .select('hit_count, confidence, expires_at');

    if (error) {
      console.error('Error fetching cache stats:', error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        hitCount: 0,
        avgConfidence: 0
      };
    }

    const now = new Date();
    const totalEntries = data?.length || 0;
    const expiredEntries = data?.filter(entry => new Date(entry.expires_at) < now).length || 0;
    const totalHits = data?.reduce((sum, entry) => sum + entry.hit_count, 0) || 0;
    const avgConfidence = data?.length > 0 
      ? data.reduce((sum, entry) => sum + Number(entry.confidence), 0) / data.length 
      : 0;

    return {
      totalEntries,
      expiredEntries,
      hitCount: totalHits,
      avgConfidence: Math.round(avgConfidence * 100) / 100
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      totalEntries: 0,
      expiredEntries: 0,
      hitCount: 0,
      avgConfidence: 0
    };
  }
};

// Clear all cache entries (for admin use)
export const clearAllCache = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('compliance_cache')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // Match all UUIDs

    if (error) {
      console.error('Error clearing cache:', error);
      return false;
    }

    console.log('Successfully cleared all cache entries');
    return true;
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return false;
  }
};