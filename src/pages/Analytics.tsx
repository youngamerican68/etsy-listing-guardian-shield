import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getComplianceAnalytics, ComplianceAnalytics } from '@/services/analyticsService';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Target, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

const Analytics = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<ComplianceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) {
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [authLoading, isAdmin]);

  const fetchAnalytics = async () => {
    try {
      const data = await getComplianceAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return <div className="flex justify-center items-center min-h-screen">No data available</div>;
  }

  const chartConfig = {
    count: {
      label: "Count",
      color: "hsl(var(--primary))",
    },
    confidence: {
      label: "Confidence",
      color: "hsl(var(--secondary))",
    },
  };

  const pieColors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Compliance Analytics</h1>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAnalyses.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.cacheHitRate}%</div>
            <p className="text-xs text-muted-foreground">Performance optimization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.complianceRate}%</div>
            <p className="text-xs text-muted-foreground">Successful compliance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgConfidence}</div>
            <p className="text-xs text-muted-foreground">AI prediction accuracy</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Analysis Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Analysis Trend (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <LineChart data={analytics.dailyAnalyses}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="var(--color-count)" 
                  strokeWidth={2}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <PieChart>
                <Pie
                  data={analytics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="status"
                >
                  {analytics.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Flagged Terms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Top Flagged Terms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topFlaggedTerms.slice(0, 8).map((term, index) => (
                <div key={term.term} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <Badge variant="outline">{term.term}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{term.count} times</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Confidence Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Confidence Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={analytics.confidenceDistribution}>
                <XAxis dataKey="range" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;