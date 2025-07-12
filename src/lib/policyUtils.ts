// src/lib/policyUtils.ts

// Helper function to generate SHA-256 hash
export async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to repair malformed JSON
function repairJsonString(jsonString: string): string {
  try {
    JSON.parse(jsonString);
    return jsonString;
  } catch {
    return jsonString.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']').replace(/([{,]\s*)(\w+):/g, '$1"$2":').replace(/:\s*'([^']*)'/g, ':"$1"').replace(/\\'/g, "'").replace(/\n/g, '\\n');
  }
}

// Client-side function to extract Table of Contents via OpenAI
export async function extractTableOfContents(policyContent: string, policyCategory: string): Promise<string[]> {
  // Note: For security, the OpenAI API key should be stored in Supabase secrets
  // and accessed via an edge function rather than exposed to the client
  console.warn("Client-side OpenAI calls expose API keys. Consider using edge functions instead.");
  
  // This would need to be configured differently in a Vite project
  // For now, this will throw an error prompting proper setup
  throw new Error("OpenAI API key configuration needed. Please use edge function approach for security.");
}

// Client-side function to find section content by title
export function findSectionContent(policyContent: string, sectionTitle: string): string {
  const lines = policyContent.split('\n');
  let startIndex = -1, endIndex = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(sectionTitle.toLowerCase()) || lines[i].trim() === sectionTitle || lines[i].includes(sectionTitle)) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    return `Section content for "${sectionTitle}" could not be located in the policy document.`;
  }

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line && (line.match(/^[A-Z\s]+$/) || line.match(/^\d+\./) || line.match(/^[A-Z][^.!?]*$/)) && line.length < 100) {
      endIndex = i;
      break;
    }
  }
  return lines.slice(startIndex, endIndex).join('\n').trim();
}