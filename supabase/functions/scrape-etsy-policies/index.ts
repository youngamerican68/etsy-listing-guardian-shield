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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          }
        });

        if (!response.ok) {
          console.error(`Failed to fetch ${url}: ${response.status}`);
          continue;
        }

        const html = await response.text();
        
        // Check if we got a GDPR consent page
        if (html.includes('Your Etsy Privacy Settings') || html.includes('gdpr-single-choice-overlay')) {
          console.warn(`Got GDPR consent page for ${category}, skipping for now`);
          continue;
        }
        
        // Extract title from HTML
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/\s*\|\s*Etsy.*$/, '').trim() : `Etsy ${category} Policy`;

        // Extract main content - look for common content containers with more specific patterns
        let content = '';
        const contentPatterns = [
          // More specific Etsy content patterns
          /<div[^>]*class="[^"]*legal-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
          /<div[^>]*class="[^"]*policy-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
          /<div[^>]*class="[^"]*terms-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
          // Generic patterns
          /<main[^>]*>([\s\S]*?)<\/main>/i,
          /<article[^>]*>([\s\S]*?)<\/article>/i,
          /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
          /<section[^>]*class="[^"]*policy[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
          /<section[^>]*class="[^"]*legal[^"]*"[^>]*>([\s\S]*?)<\/section>/i,
        ];

        for (const pattern of contentPatterns) {
          const match = html.match(pattern);
          if (match) {
            content = match[1];
            console.log(`Found content using pattern: ${pattern.source.substring(0, 50)}...`);
            break;
          }
        }

        // If no structured content found, try to extract from body but exclude known non-content elements
        if (!content) {
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch) {
            content = bodyMatch[1];
          } else {
            content = html;
          }
        }

        // Clean HTML tags and normalize whitespace
        content = content
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
          .replace(/<div[^>]*id="gdpr-single-choice-overlay"[^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<div[^>]*data-gdpr-consent-prompt[^>]*>[\s\S]*?<\/div>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\s+/g, ' ')
          .trim();

        // Log content length for debugging
        console.log(`Content length for ${category}: ${content.length} characters`);
        console.log(`First 200 chars: ${content.substring(0, 200)}`);

        // Only add if we got substantial content and it doesn't look like a consent page
        if (content.length > 100 && !content.includes('Your Etsy Privacy Settings')) {
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

          scrapedPolicies.push({
            title,
            url,
            content,
            category,
            lastUpdated
          });
          console.log(`Successfully scraped ${category}: ${content.length} characters`);
        } else {
          console.warn(`Skipped ${category}: insufficient content (${content.length} chars) or consent page detected`);
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