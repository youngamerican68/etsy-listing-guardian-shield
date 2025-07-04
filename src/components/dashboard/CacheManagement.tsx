import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, RefreshCw, BarChart3 } from "lucide-react";
import { getCacheStats, cleanupExpiredCache, clearAllCache, CacheStats } from "@/utils/cacheManager";
import { toast } from "sonner";

const CacheManagement = () => {
  const [stats, setStats] = useState<CacheStats>({
    totalEntries: 0,
    expiredEntries: 0,
    hitCount: 0,
    avgConfidence: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const cacheStats = await getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      toast.error('Failed to load cache statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanupExpired = async () => {
    setIsLoading(true);
    try {
      await cleanupExpiredCache();
      await loadStats();
      toast.success('Expired cache entries cleaned up successfully');
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error);
      toast.error('Failed to cleanup expired cache entries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const success = await clearAllCache();
      if (success) {
        await loadStats();
        toast.success('All cache entries cleared successfully');
      } else {
        toast.error('Failed to clear cache entries');
      }
    } catch (error) {
      console.error('Failed to clear all cache:', error);
      toast.error('Failed to clear cache entries');
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const cacheHitRate = stats.totalEntries > 0 
    ? Math.round((stats.hitCount / stats.totalEntries) * 100) / 100 
    : 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          AI Response Cache Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalEntries}</div>
            <div className="text-sm text-muted-foreground">Total Entries</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{stats.hitCount}</div>
            <div className="text-sm text-muted-foreground">Cache Hits</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{stats.expiredEntries}</div>
            <div className="text-sm text-muted-foreground">Expired Entries</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-info">{stats.avgConfidence}</div>
            <div className="text-sm text-muted-foreground">Avg Confidence</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline">
            Hit Rate: {cacheHitRate}x
          </Badge>
          <Badge variant={stats.expiredEntries > 0 ? "destructive" : "secondary"}>
            {stats.expiredEntries} Expired
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={loadStats}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Stats
          </Button>
          
          <Button
            onClick={handleCleanupExpired}
            disabled={isLoading || stats.expiredEntries === 0}
            variant="outline"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cleanup Expired ({stats.expiredEntries})
          </Button>
          
          <Button
            onClick={handleClearAll}
            disabled={isClearing || stats.totalEntries === 0}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Cache
          </Button>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Cache Strategy:</strong> Results are cached for 7 days. Cache hits avoid expensive AI analysis, 
            reducing costs and improving response times. Hit rate shows average reuse per cached entry.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CacheManagement;