// Test script to validate fix suggestion key matching
// This can be run in browser console to debug the issue

console.log('🧪 Testing Fix Suggestion Key Matching');

// Test case 1: Key normalization
const testTerms = [
  'Dwight Schrute',
  'dwight schrute',
  ' Dwight Schrute ',
  'DWIGHT SCHRUTE',
  'Benny Hills laugh can',
  'benny hills laugh can',
  ' Benny Hills laugh can '
];

testTerms.forEach(term => {
  const normalized = term.toLowerCase().trim();
  console.log(`Original: "${term}" -> Normalized: "${normalized}"`);
});

// Test case 2: Map key matching simulation
const fixSuggestions = new Map();

// Simulate storing suggestions
fixSuggestions.set('dwight schrute', { 
  alternatives: ['Office character mask', 'TV show inspired costume'],
  originalTerm: 'Dwight Schrute'
});

fixSuggestions.set('benny hills laugh can', { 
  alternatives: ['Novelty sound effect', 'Comedy audio device'],
  originalTerm: 'Benny Hills laugh can'
});

// Test retrieval with different cases
const testRetrievals = [
  'Dwight Schrute',
  'dwight schrute',
  'Benny Hills laugh can',
  'benny hills laugh can'
];

testRetrievals.forEach(term => {
  const key = term.toLowerCase().trim();
  const suggestion = fixSuggestions.get(key);
  console.log(`\nTerm: "${term}"`);
  console.log(`Key: "${key}"`);
  console.log(`Found suggestion:`, suggestion?.originalTerm);
  console.log(`Alternatives:`, suggestion?.alternatives);
});

console.log('✅ Test complete');