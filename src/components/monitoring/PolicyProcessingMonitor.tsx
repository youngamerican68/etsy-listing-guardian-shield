import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface ProcessingStatus {
  total_policies: number;
  total_sections: number;
  processing_active: boolean;
  current_policy: string;
  current_section: string;
  last_processed: string;
  sections_today: number;
  success_rate: number;
  estimated_completion: string;
}

interface ProcessingLogEntry {
  id: string;
  policy_id: string;
  section_title: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  processing_time_ms: number;
  error_message: string;
  created_at: string;
}

const PolicyProcessingMonitor: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [recentLogs, setRecentLogs] = useState<ProcessingLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStatus = async () => {
    try {
      // Get processing progress
      const { data: progressData, error: progressError } = await supabase
        .rpc('get_processing_progress');

      if (progressError) throw progressError;

      setStatus(progressData);

      // Get recent processing logs
      const { data: logsData, error: logsError } = await supabase
        .from('policy_processing_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;

      setRecentLogs(logsData || []);
    } catch (error) {
      console.error('Error fetching processing status:', error);
      toast({
        title: "Error",
        description: "Failed to fetch processing status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Set up real-time subscription for processing logs
    const subscription = supabase
      .channel('processing_monitor')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'policy_processing_log' 
        }, 
        () => {
          fetchStatus(); // Refresh when new log entries are added
        }
      )
      .subscribe();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'started': return 'bg-blue-500';
      case 'skipped': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (isActive: boolean) => {
    if (isActive) {
      return <Activity className="h-4 w-4 text-green-500 animate-pulse" />;
    }
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const progressPercentage = status ? 
    Math.round((status.total_sections / (status.total_policies * 5)) * 100) : 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading processing status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(status?.processing_active || false)}
            Policy Processing Status
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStatus}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {status && (
            <>
              {/* Progress Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {status.total_policies}
                  </div>
                  <div className="text-sm text-gray-600">Total Policies</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {status.total_sections}
                  </div>
                  <div className="text-sm text-gray-600">Sections Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {status.sections_today}
                  </div>
                  <div className="text-sm text-gray-600">Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {status.success_rate}%
                  </div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              {/* Current Processing */}
              {status.processing_active && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                    <span className="font-medium">Currently Processing</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Policy:</strong> {status.current_policy}</div>
                    <div><strong>Section:</strong> {status.current_section}</div>
                  </div>
                </div>
              )}

              {/* Last Processed */}
              {status.last_processed && (
                <div className="text-sm text-gray-600">
                  <strong>Last processed:</strong> {new Date(status.last_processed).toLocaleString()}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Recent Processing Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                No recent processing activity
              </div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(log.status)}`} />
                    <div>
                      <div className="font-medium text-sm">{log.section_title}</div>
                      <div className="text-xs text-gray-600">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={log.status === 'completed' ? 'default' : 
                                  log.status === 'failed' ? 'destructive' : 'secondary'}>
                      {log.status}
                    </Badge>
                    {log.processing_time_ms && (
                      <span className="text-xs text-gray-500">
                        {log.processing_time_ms}ms
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PolicyProcessingMonitor;