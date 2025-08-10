// Add new compliance rules based on comprehensive policy research
// These rules fill the gaps identified in current coverage

import { supabase } from '@/integrations/supabase/client';

export const newComplianceRules = [
  // Hazardous Materials (detailed subcategories)
  { term: 'explosive', reason: 'Explosives and explosive precursors are strictly prohibited for safety reasons', risk_level: 'critical' },
  { term: 'fireworks', reason: 'Fireworks are prohibited as hazardous explosive materials', risk_level: 'critical' },
  { term: 'sparklers', reason: 'Sparklers are prohibited as explosive materials', risk_level: 'high' },
  { term: 'flammable liquid', reason: 'Flammable liquids pose safety hazards and are prohibited', risk_level: 'critical' },
  { term: 'radioactive', reason: 'Radioactive materials are strictly prohibited for safety', risk_level: 'critical' },
  { term: 'toxic substance', reason: 'Toxic substances are prohibited for safety reasons', risk_level: 'critical' },
  { term: 'lithium battery', reason: 'Individual lithium-ion batteries are restricted for safety', risk_level: 'high' },
  { term: 'recalled', reason: 'Items recalled by government agencies or manufacturers are prohibited', risk_level: 'critical' },
  { term: 'cpsc recall', reason: 'Products recalled by Consumer Product Safety Commission are banned', risk_level: 'critical' },
  { term: 'fda recall', reason: 'Products recalled by FDA are prohibited from sale', risk_level: 'critical' },

  // Weapons and Violence (enhanced)
  { term: 'firearm', reason: 'Firearms and weapon components are strictly prohibited', risk_level: 'critical' },
  { term: 'realistic weapon', reason: 'Realistic weapons are prohibited even as replicas', risk_level: 'critical' },
  { term: 'knife weapon', reason: 'Knives intended to inflict harm are prohibited', risk_level: 'critical' },
  { term: 'promote violence', reason: 'Items promoting violence face immediate removal', risk_level: 'critical' },
  { term: 'glorify hatred', reason: 'Content glorifying hatred violates zero tolerance policy', risk_level: 'critical' },

  // Adult Content (detailed restrictions)
  { term: 'pornographic', reason: 'Pornographic materials are strictly prohibited', risk_level: 'critical' },
  { term: 'non-consensual', reason: 'Non-consensual sexual content is banned', risk_level: 'critical' },
  { term: 'sex organs', reason: 'Depictions of sex organs are prohibited', risk_level: 'critical' },
  { term: 'bestiality', reason: 'Content depicting bestiality is strictly banned', risk_level: 'critical' },
  { term: 'incest', reason: 'Content depicting incest is prohibited', risk_level: 'critical' },
  { term: 'mature content', reason: 'Certain mature content violates community standards', risk_level: 'high' },

  // Impersonation and Fraud
  { term: 'law enforcement', reason: 'Items aiding impersonation of law enforcement are banned', risk_level: 'critical' },
  { term: 'military uniform', reason: 'Realistic military items for impersonation are prohibited', risk_level: 'high' },
  { term: 'government official', reason: 'Items for impersonating government officials are banned', risk_level: 'critical' },
  { term: 'fake identity', reason: 'Items facilitating fake identity creation are prohibited', risk_level: 'critical' },

  // Financial and Regulatory (expanded)
  { term: 'lottery ticket', reason: 'Lottery tickets are prohibited due to regulations', risk_level: 'high' },
  { term: 'cryptocurrency mining', reason: 'Cryptocurrency mining rigs face complex regulations', risk_level: 'medium' },
  { term: 'current currency', reason: 'Current exchangeable currency cannot be sold', risk_level: 'high' },
  { term: 'financial instrument', reason: 'Stocks, bonds, and securities are prohibited', risk_level: 'high' },
  { term: 'real estate', reason: 'Real estate sales are not permitted on Etsy', risk_level: 'medium' },
  { term: 'motor vehicle', reason: 'Motor vehicles cannot be sold due to regulations', risk_level: 'medium' },

  // Endangered Species and Animals
  { term: 'endangered species', reason: 'Products from endangered species are strictly prohibited', risk_level: 'critical' },
  { term: 'live animal', reason: 'Live animals cannot be sold on Etsy', risk_level: 'critical' },
  { term: 'ivory', reason: 'Ivory products are banned to protect endangered species', risk_level: 'critical' },
  { term: 'rhino horn', reason: 'Rhino horn products are prohibited to protect endangered species', risk_level: 'critical' },
  { term: 'tiger bone', reason: 'Tiger bone products violate endangered species protection', risk_level: 'critical' },

  // High-Powered Magnets (safety)
  { term: 'high-powered magnet', reason: 'High-powered magnets pose safety hazards, especially to children', risk_level: 'high' },
  { term: 'rare earth magnet', reason: 'Loose rare earth magnets exceeding flux ratings are dangerous', risk_level: 'high' },
  { term: 'neodymium magnet', reason: 'Powerful neodymium magnets can cause serious injuries', risk_level: 'high' },

  // Handmade Policy Violations
  { term: 'drop shipping', reason: 'Drop-shipping arrangements violate handmade production standards', risk_level: 'high' },
  { term: 'mass produced', reason: 'Mass-produced items violate handmade creativity standards', risk_level: 'high' },
  { term: 'reseller', reason: 'Reselling non-handmade items violates marketplace policies', risk_level: 'high' },
  { term: 'wholesale', reason: 'Wholesale reselling violates handmade requirements', risk_level: 'medium' },
  { term: 'aliexpress', reason: 'Reselling AliExpress items violates handmade policies', risk_level: 'high' },
  { term: 'alibaba', reason: 'Reselling Alibaba items violates creativity standards', risk_level: 'high' },

  // Production Partner Issues
  { term: 'undisclosed partner', reason: 'Production partners must be disclosed in listings', risk_level: 'medium' },
  { term: 'hidden manufacturing', reason: 'Manufacturing arrangements must be transparent', risk_level: 'medium' },

  // Vintage Violations (20-year rule)
  { term: 'fake vintage', reason: 'Items designed to appear vintage but under 20 years old are prohibited', risk_level: 'high' },
  { term: 'reproduction vintage', reason: 'Vintage reproductions must meet 20+ year age requirement', risk_level: 'medium' },

  // Fee Avoidance
  { term: 'off-site payment', reason: 'Directing buyers off-site to avoid fees is prohibited', risk_level: 'high' },
  { term: 'paypal direct', reason: 'Bypassing Etsy payment system violates fee policies', risk_level: 'high' },
  { term: 'venmo direct', reason: 'Direct payment arrangements circumvent required fee structure', risk_level: 'high' },
  { term: 'avoid fees', reason: 'Fee avoidance schemes are strictly prohibited', risk_level: 'high' },

  // Hate Speech and Discrimination
  { term: 'hate group', reason: 'Content promoting hate groups is prohibited', risk_level: 'critical' },
  { term: 'racial slur', reason: 'Racial slurs violate community conduct standards', risk_level: 'critical' },
  { term: 'religious slur', reason: 'Religious discrimination violates community guidelines', risk_level: 'critical' },
  { term: 'nazi symbol', reason: 'Nazi symbols and hate imagery are strictly banned', risk_level: 'critical' },
  { term: 'confederate flag', reason: 'Confederate symbols may violate hate speech policies', risk_level: 'high' },

  // Misinformation and Harmful Content
  { term: 'medical misinformation', reason: 'False medical claims pose health risks and are prohibited', risk_level: 'critical' },
  { term: 'conspiracy theory', reason: 'Harmful conspiracy theories may violate community standards', risk_level: 'medium' },
  { term: 'dangerous advice', reason: 'Advice that could cause harm is prohibited', risk_level: 'high' },
  { term: 'self-harm', reason: 'Content promoting self-harm is strictly prohibited', risk_level: 'critical' },

  // Privacy and Harassment
  { term: 'doxxing', reason: 'Sharing personal information without consent is prohibited', risk_level: 'critical' },
  { term: 'harassment', reason: 'Harassing behavior violates community conduct standards', risk_level: 'high' },
  { term: 'bullying', reason: 'Bullying behavior is prohibited in all community spaces', risk_level: 'high' },
  { term: 'stalking', reason: 'Stalking behavior violates community safety standards', risk_level: 'critical' },

  // Trademark and Copyright (enhanced)
  { term: 'unauthorized merchandise', reason: 'Unofficial merchandise violates IP rights regardless of handmade status', risk_level: 'high' },
  { term: 'bootleg', reason: 'Bootleg items infringe on intellectual property rights', risk_level: 'high' },
  { term: 'unlicensed', reason: 'Unlicensed use of protected IP requires proper authorization', risk_level: 'high' },
  { term: 'inspired by', reason: 'Inspired items may still constitute infringement if creating consumer confusion', risk_level: 'medium' },
];

export async function addNewComplianceRules() {
  console.log('🚀 Adding new compliance rules...');
  
  try {
    // Get existing rules to avoid duplicates
    const { data: existingRules, error: fetchError } = await supabase
      .from('compliance_rules')
      .select('term');
    
    if (fetchError) {
      throw new Error(`Failed to fetch existing rules: ${fetchError.message}`);
    }
    
    const existingTerms = new Set(existingRules?.map(r => r.term.toLowerCase()) || []);
    
    // Filter for new rules only
    const newRules = newComplianceRules.filter(rule => 
      !existingTerms.has(rule.term.toLowerCase())
    );
    
    console.log(`🔍 Found ${newRules.length} new compliance rules to add`);
    
    if (newRules.length === 0) {
      console.log('✅ No new rules to add. All rules already exist.');
      return { success: true, added: 0, message: 'No new rules to add' };
    }
    
    // Insert new rules in batches
    const batchSize = 20;
    let totalAdded = 0;
    
    for (let i = 0; i < newRules.length; i += batchSize) {
      const batch = newRules.slice(i, i + batchSize);
      
      const { data: insertedRules, error: insertError } = await supabase
        .from('compliance_rules')
        .insert(batch)
        .select();
      
      if (insertError) {
        throw new Error(`Failed to insert rules batch: ${insertError.message}`);
      }
      
      totalAdded += insertedRules?.length || 0;
      console.log(`✅ Added batch ${Math.floor(i/batchSize) + 1}: ${insertedRules?.length} rules`);
    }
    
    console.log(`🎉 Successfully added ${totalAdded} new compliance rules!`);
    console.log('📊 Rules by risk level:');
    
    const riskCounts = newRules.reduce((acc, rule) => {
      acc[rule.risk_level] = (acc[rule.risk_level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(riskCounts).forEach(([level, count]) => {
      console.log(`  - ${level}: ${count} rules`);
    });
    
    return { 
      success: true, 
      added: totalAdded, 
      riskBreakdown: riskCounts,
      message: `Successfully added ${totalAdded} new compliance rules`
    };
    
  } catch (error) {
    console.error('💥 Error adding compliance rules:', error.message);
    return { 
      success: false, 
      added: 0, 
      error: error.message,
      message: `Failed to add rules: ${error.message}`
    };
  }
}