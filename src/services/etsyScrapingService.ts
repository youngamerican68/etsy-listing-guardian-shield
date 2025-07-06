import { supabase } from '@/integrations/supabase/client';

export interface ScrapedPolicy {
  title: string;
  url: string;
  content: string;
  category: string;
  lastUpdated?: string;
}

export class EtsyScrapingService {
  async scrapeEtsyPolicies(categories?: string[]): Promise<ScrapedPolicy[]> {
    try {
      const { data, error } = await supabase.functions.invoke('scrape-etsy-policies', {
        body: { categories }
      });

      if (error) {
        throw new Error(`Scraping failed: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Scraping failed');
      }

      return data.policies;
    } catch (error) {
      console.error('Error scraping Etsy policies:', error);
      throw error;
    }
  }
}

export const etsyScrapingService = new EtsyScrapingService();