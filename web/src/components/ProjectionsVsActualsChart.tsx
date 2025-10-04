'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ComposedChart, Bar, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ReferenceLine } from 'recharts';
import { buildApiUrl } from '@/config/api';
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ProjectionsVsActualsData {
  week_number: number;
  year: number;
  projection: number | null;
  actual: number | null;
  salary: number | null;
  value: number | null;
  week_status: string;
}

interface ProjectionsVsActualsResponse {
  data: ProjectionsVsActualsData[];
  player_name: string;
  player_position: string;
  total_weeks: number;
}

interface ProjectionsVsActualsChartProps {
  playerId: string;
}

interface ChartDataPoint {
  week: string;
  projection: number;
  actual: number;
  weekNumber: number;
  year: number;
}

export function ProjectionsVsActualsChart({ playerId }: ProjectionsVsActualsChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerInfo, setPlayerInfo] = useState<{ name: string; position: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(buildApiUrl(`/api/players/${playerId}/projections-vs-actuals`));
        
        if (!response.ok) {
          throw new Error(`Failed to fetch projections vs actuals: ${response.status}`);
        }
        
        const data: ProjectionsVsActualsResponse = await response.json();

        // Transform data for chart
        const transformedData = data.data
          .filter(item => item.projection !== null || item.actual !== null) // Only include weeks with data
          .map(item => ({
            week: `Week ${item.week_number}`,
            projection: item.projection || 0,
            actual: item.actual || 0,
            value: item.value || 0,
            salary: item.salary || 0,
            weekNumber: item.week_number,
            year: item.year
          }))
          .sort((a, b) => a.weekNumber - b.weekNumber); // Sort by week number ascending

        setChartData(transformedData);
        setPlayerInfo({ name: data.player_name, position: data.player_position });
      } catch (err) {
        console.error('Error fetching projections vs actuals:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };

    if (playerId) {
      fetchData();
    }
  }, [playerId]);

  // Calculate performance statistics
  const calculateStats = () => {
    if (chartData.length === 0) return null;

    const weeksWithBoth = chartData.filter(item => item.projection > 0 && item.actual >= 0);
    if (weeksWithBoth.length === 0) return null;

    const overperformances = weeksWithBoth.filter(item => item.actual > item.projection).length;
    const underperformances = weeksWithBoth.filter(item => item.actual < item.projection).length;
    const exactMatches = weeksWithBoth.filter(item => Math.abs(item.actual - item.projection) < 0.1).length;

    return {
      overperformances,
      underperformances,
      exactMatches,
      totalWeeks: weeksWithBoth.length
    };
  };

  const stats = calculateStats();

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const projection = data.projection;
      const actual = data.actual;
      const value = data.value;
      const salary = data.salary;
      const difference = actual - projection;
      const percentage = projection > 0 ? ((difference / projection) * 100).toFixed(1) : 0;

      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 bg-gray-300 rounded mr-2"></span>
            Projection: <span className="font-medium">{projection.toFixed(1)}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded mr-2"></span>
            Actual: <span className="font-medium">{actual.toFixed(1)}</span>
          </p>
          <p className="text-sm font-medium">
            Difference: 
            <span className={`ml-1 ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {difference >= 0 ? '+' : ''}{difference.toFixed(1)} ({percentage}%)
            </span>
          </p>
          {salary && salary > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="inline-block w-3 h-3 bg-emerald-500 rounded mr-2"></span>
              Value: <span className="font-medium">{value.toFixed(2)}</span> pts/$
            </p>
          )}
          {salary && salary > 0 && (
            <p className="text-xs text-muted-foreground">
              Salary: ${salary.toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Performance vs Projections
          </CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading performance data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance vs Projections</CardTitle>
          <CardDescription>Unable to load chart data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-red-600 mb-2">Error loading data</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance vs Projections</CardTitle>
          <CardDescription>
            {playerInfo ? `${playerInfo.name} (${playerInfo.position})` : 'Player performance data'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">No performance data available</p>
              <p className="text-xs text-muted-foreground">
                Projection and actual data not found for this player
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Performance vs Projections
          {stats && (
            <div className="flex items-center gap-1 ml-auto">
              {stats.overperformances > stats.underperformances ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : stats.underperformances > stats.overperformances ? (
                <TrendingDown className="w-4 h-4 text-red-600" />
              ) : (
                <Minus className="w-4 h-4 text-gray-500" />
              )}
            </div>
          )}
        </CardTitle>
        <CardDescription>
          {playerInfo ? `${playerInfo.name} (${playerInfo.position})` : 'Player performance data'}
          {stats && (
            <span className="ml-2 text-xs">
              • {stats.overperformances} over, {stats.underperformances} under
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 80, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                className="text-xs"
                tick={{ fontSize: 12 }}
                label={{ value: 'Fantasy Points', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 12 } }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                className="text-xs"
                tick={{ fontSize: 12 }}
                domain={[0, (dataMax) => Math.max(5, dataMax + 2)]}
                label={{ value: 'Value', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 12 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="rect"
              />
              <ReferenceLine 
                yAxisId="right"
                y={3.0}
                stroke="#ef4444"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ value: "Value Target = 3.0", position: "topRight", style: { fontSize: 10, fill: "#ef4444" } }}
              />
              <Bar 
                yAxisId="left"
                dataKey="projection" 
                fill="#e5e7eb" 
                name="Projection"
                radius={[2, 2, 0, 0]}
              />
              <Scatter 
                yAxisId="left"
                dataKey="actual" 
                fill="#3b82f6" 
                name="Actual"
                r={4}
              />
              <Line 
                yAxisId="right"
                type="monotone"
                dataKey="value" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Value"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {stats && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.overperformances}</p>
                <p className="text-xs text-muted-foreground">Overperformed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.underperformances}</p>
                <p className="text-xs text-muted-foreground">Underperformed</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{stats.exactMatches}</p>
                <p className="text-xs text-muted-foreground">Exact Match</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
