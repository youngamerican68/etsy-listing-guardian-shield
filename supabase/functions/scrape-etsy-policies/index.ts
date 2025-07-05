import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapedPolicy {
  title: string;
  url: string;
  content: string;
  category: string;
  lastUpdated?: string;
}

const ETSY_POLICY_URLS = {
  'terms': 'https://www.etsy.com/legal/terms-of-use',
  'prohibited_items': 'https://www.etsy.com/legal/prohibited',
  'handmade': 'https://www.etsy.com/legal/handmade',
  'intellectual_property': 'https://www.etsy.com/legal/ip',
  'fees_payments': 'https://www.etsy.com/legal/fees',
  'community_conduct': 'https://www.etsy.com/legal/community'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categories = Object.keys(ETSY_POLICY_URLS) } = await req.json();
    const scrapedPolicies: ScrapedPolicy[] = [];

    for (const category of categories) {
      const url = ETSY_POLICY_URLS[category as keyof typeof ETSY_POLICY_URLS];
      if (!url) continue;

      try {
        console.log(`Scraping ${category} from ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; EtsyComplianceBot/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        });

        if (!response.ok) {
          console.error(`Failed to fetch ${url}: ${response.status}`);
          continue;
        }

        const html = await response.text();
        
        // Extract title from HTML
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/\s*\|\s*Etsy.*$/, '').trim() : `Etsy ${category} Policy`;

        // Extract main content - look for common content containers
        let content = '';
        const contentPatterns = [
          /<main[^>]*>([\s\S]*?)<\/main>/i,
          /<article[^>]*>([\s\S]*?)<\/article>/i,
          /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
          /<section[^>]*>([\s\S]*?)<\/section>/i
        ];

        for (const pattern of contentPatterns) {
          const match = html.match(pattern);
          if (match) {
            content = match[1];
            break;
          }
        }

        // If no structured content found, try to extract from body
        if (!content) {
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          content = bodyMatch ? bodyMatch[1] : html;
        }

        // Clean HTML tags and normalize whitespace
        content = content
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();

        // Extract last updated date if available
        const datePatterns = [
          /last updated:?\s*([^.\n]+)/i,
          /effective:?\s*([^.\n]+)/i,
          /updated on:?\s*([^.\n]+)/i
        ];
        
        let lastUpdated = undefined;
        for (const pattern of datePatterns) {
          const match = content.match(pattern);
          if (match) {
            lastUpdated = match[1].trim();
            break;
          }
        }

        if (content.length > 100) { // Only add if we got substantial content
          scrapedPolicies.push({
            title,
            url,
            content,
            category,
            lastUpdated
          });
          console.log(`Successfully scraped ${category}: ${content.length} characters`);
        }

      } catch (error) {
        console.error(`Error scraping ${category}:`, error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      policies: scrapedPolicies,
      count: scrapedPolicies.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scrape-etsy-policies function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});