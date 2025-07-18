import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RefreshCw, Settings, Zap } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

const ProcessingControls: React.FC = () => {
  const [loading, setLoading] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  const setLoadingState = (key: string, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  };

  const handleToggleProcessing = async (enable: boolean) => {
    const key = 'toggle';
    setLoadingState(key, true);

    try {
      const { data, error } = await supabase
        .rpc('toggle_policy_processing', { enable_processing: enable });

      if (error) throw error;

      toast({
        title: enable ? "Processing Enabled" : "Processing Disabled",
        description: data,
        variant: "default"
      });
    } catch (error) {
      console.error('Error toggling processing:', error);
      toast({
        title: "Error",
        description: `Failed to ${enable ? 'enable' : 'disable'} processing`,
        variant: "destructive"
      });
    } finally {
      setLoadingState(key, false);
    }
  };

  const handleManualTrigger = async () => {
    const key = 'manual';
    setLoadingState(key, true);

    try {
      const { data, error } = await supabase
        .rpc('manual_trigger_processing');

      if (error) throw error;

      toast({
        title: "Processing Triggered",
        description: "Manual processing has been started",
        variant: "default"
      });
    } catch (error) {
      console.error('Error triggering processing:', error);
      toast({
        title: "Error",
        description: "Failed to trigger manual processing",
        variant: "destructive"
      });
    } finally {
      setLoadingState(key, false);
    }
  };

  const handleDirectEdgeFunction = async () => {
    const key = 'direct';
    setLoadingState(key, true);

    try {
      const { data, error } = await supabase.functions
        .invoke('process-single-section', {
          body: {}
        });

      if (error) throw error;

      toast({
        title: "Direct Processing",
        description: data.success ? 
          (data.completed ? 'All policies processed!' : `Processed: ${data.section_title}`) : 
          `Error: ${data.error}`,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error calling edge function:', error);
      toast({
        title: "Error",
        description: "Failed to call processing function directly",
        variant: "destructive"
      });
    } finally {
      setLoadingState(key, false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Processing Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Automated Processing Controls */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Automated Processing (Every 5 minutes)
          </h4>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => handleToggleProcessing(true)}
              disabled={loading.toggle}
              className="gap-2"
              variant="default"
            >
              {loading.toggle ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Enable Auto Processing
            </Button>
            
            <Button 
              onClick={() => handleToggleProcessing(false)}
              disabled={loading.toggle}
              variant="outline"
              className="gap-2"
            >
              {loading.toggle ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              Disable Auto Processing
            </Button>
          </div>
          
          <div className="text-sm text-gray-600">
            <Badge variant="secondary" className="mb-2">
              Recommended
            </Badge>
            <p>
              Automated processing runs every 5 minutes and processes one section at a time. 
              This is the most reliable method and prevents timeouts.
            </p>
          </div>
        </div>

        <hr className="my-4" />

        {/* Manual Controls */}
        <div className="space-y-3">
          <h4 className="font-medium">Manual Processing</h4>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleManualTrigger}
              disabled={loading.manual}
              variant="outline"
              className="gap-2"
            >
              {loading.manual ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Trigger One Section
            </Button>
            
            <Button 
              onClick={handleDirectEdgeFunction}
              disabled={loading.direct}
              variant="outline"
              className="gap-2"
            >
              {loading.direct ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              Direct Edge Function Call
            </Button>
          </div>
          
          <div className="text-sm text-gray-600">
            Use manual triggers for testing or immediate processing needs.
          </div>
        </div>

        <hr className="my-4" />

        {/* Status Information */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">How It Works</h4>
          <ul className="text-sm space-y-1">
            <li>• <strong>Automated:</strong> Processes 1 section every 5 minutes</li>
            <li>• <strong>Safe:</strong> Each run takes ~10-30 seconds (no timeouts)</li>
            <li>• <strong>Progress:</strong> Monitor above in real-time</li>
            <li>• <strong>Complete:</strong> Will process all 6 policies (30+ sections)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessingControls;