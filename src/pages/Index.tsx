// src/components/dashboard/PolicyParserManager.tsx
// CORRECTED ORCHESTRATOR LOGIC

// ... (keep all your imports and the rest of the component the same)

// Replace the existing processAllPolicies function with this one:
const processAllPolicies = async (jobId: string) => {
  if (!jobId) {
    console.error("Job ID is required to start processing.");
    setResult({ success: false, message: 'Job ID is required.' });
    return;
  }

  setIsProcessing(true);
  setHasActiveJob(true);
  setProcessedPoliciesCount(0);
  setCurrentPolicyCategory('');

  let isJobComplete = false;
  let processedCount = 0;

  // This is the ONLY loop needed.
  while (!isJobComplete) {
    try {
      // STEP 1: FIND the next policy to work on.
      setCurrentPolicyCategory('Finding next policy...');
      console.log("Orchestrator: Finding next policy...");

      const findResponse = await supabase.functions.invoke('process-policies-ai', {
        body: { jobId }
      });

      if (findResponse.error) throw new Error(findResponse.error.message);
      
      const findResult = findResponse.data;

      if (findResult.completed) {
        isJobComplete = true;
        console.log("Orchestrator: All policies processed!");
        setResult({ success: true, message: 'All policies processed successfully!' });
        break; // Exit the loop
      }

      if (findResult.nextPolicyId) {
        // STEP 2: PROCESS the entire policy found in Step 1.
        console.log(`Orchestrator: Found policy ${findResult.policyCategory}. Telling server to process it.`);
        setCurrentPolicyCategory(findResult.policyCategory);

        const processResponse = await supabase.functions.invoke('process-policies-ai', {
          body: {
            jobId,
            policyId: findResult.nextPolicyId
          }
        });

        if (processResponse.error) throw new Error(processResponse.error.message);

        console.log(`Orchestrator: Server finished processing ${findResult.policyCategory}.`);
        processedCount++;
        setProcessedPoliciesCount(processedCount);

      } else {
        // This case should not happen if the logic is correct, but it's a safe exit.
        console.error("Orchestrator: Finder did not return a next policy or completion flag. Stopping.");
        isJobComplete = true;
      }

      // Small delay between processing one entire policy and finding the next.
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error("Orchestrator: A critical error occurred.", error);
      setResult({ success: false, message: error instanceof Error ? error.message : 'An unknown error stopped the process.' });
      isJobComplete = true; // Stop the loop on any error
    }
  }

  setIsProcessing(false);
  setHasActiveJob(false);
  setCurrentPolicyCategory('');
  // When the loop finishes (either by completion or error), refresh the job monitor.
  if (currentJobId) {
    // This will trigger a re-fetch in the JobProgressMonitor if it's designed to listen to prop changes
  }
};

// ... (the rest of your component code remains unchanged)