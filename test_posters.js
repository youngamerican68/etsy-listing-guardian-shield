// Test script to analyze why "posters" is being flagged
import { analyzeListingContent } from './src/services/listingAnalyzer.js';

console.log('🔍 Testing "posters" flagging issue...');

const testListing = `
Title: Vintage Travel Posters Collection
Description: Beautiful vintage-style travel posters perfect for home decoration. These are original artwork prints inspired by classic travel advertisements.
Tags: vintage, posters, travel, artwork, decoration
Category: Art & Collectibles
Price: $25.00
`;

console.log('📝 Test listing content:');
console.log(testListing);
console.log('\n🔍 Running analysis...\n');

analyzeListingContent(testListing)
  .then(result => {
    console.log('📊 Analysis Results:');
    console.log('Status:', result.compliance_status);
    console.log('Total Issues:', result.analysis_results.total_issues);
    console.log('Risk Level:', result.analysis_results.risk_assessment.overall);
    
    if (result.analysis_results.flagged_issues.length > 0) {
      console.log('\n🚨 Flagged Issues:');
      result.analysis_results.flagged_issues.forEach(issue => {
        console.log(`- Term: "${issue.term}"`);
        console.log(`  Type: ${issue.type}`);
        console.log(`  Risk Level: ${issue.risk_level}`);
        console.log(`  Reason: ${issue.description}`);
        console.log(`  Found in: ${issue.found_in?.context || 'N/A'}`);
        console.log('---');
      });
    } else {
      console.log('\n✅ No issues found - "posters" should be allowed!');
    }
  })
  .catch(error => {
    console.error('❌ Analysis failed:', error);
  });