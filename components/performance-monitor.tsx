"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePerformanceMonitor } from "@/hooks/use-performance-monitor";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Cpu,
  HardDrive,
  Monitor,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PerformanceMonitorProps {
  className?: string;
  compact?: boolean;
}

export function PerformanceMonitor({ 
  className, 
  compact = false 
}: PerformanceMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    metrics,
    isMonitoring,
    getOptimizationSuggestions,
    forceCleanup,
  } = usePerformanceMonitor();

  const suggestions = getOptimizationSuggestions();

  // Format memory usage
  const formatMemory = (mb: number) => {
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(0)} MB`;
  };

  // Get performance status color
  const getStatusColor = () => {
    if (metrics.isPerformanceGood) return "text-green-500";
    if (metrics.fps > 15 && metrics.memoryUsage < 800) return "text-yellow-500";
    return "text-red-500";
  };

  const getStatusText = () => {
    if (metrics.isPerformanceGood) return "Good";
    if (metrics.fps > 15 && metrics.memoryUsage < 800) return "Fair";
    return "Poor";
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge 
          variant="outline" 
          className={cn("gap-1", getStatusColor())}
        >
          <Activity className="h-3 w-3" />
          {metrics.fps} FPS
        </Badge>
        <Badge variant="outline" className="gap-1">
          <HardDrive className="h-3 w-3" />
          {formatMemory(metrics.memoryUsage)}
        </Badge>
        {!metrics.isPerformanceGood && (
          <Button
            size="sm"
            variant="outline"
            onClick={forceCleanup}
            className="h-6 px-2"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                <CardTitle className="text-lg">Performance Monitor</CardTitle>
                <Badge 
                  variant="outline" 
                  className={cn("gap-1", getStatusColor())}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    metrics.isPerformanceGood ? "bg-green-500" : 
                    metrics.fps > 15 ? "bg-yellow-500" : "bg-red-500"
                  )} />
                  {getStatusText()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {metrics.activeStreams} active streams
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* FPS */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-medium">FPS</span>
                </div>
                <div className="text-2xl font-bold">{metrics.fps}</div>
                <Progress 
                  value={Math.min(100, (metrics.fps / 60) * 100)} 
                  className="h-2"
                />
              </div>

              {/* Memory Usage */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  <span className="text-sm font-medium">Memory</span>
                </div>
                <div className="text-2xl font-bold">{formatMemory(metrics.memoryUsage)}</div>
                <Progress 
                  value={Math.min(100, (metrics.memoryUsage / 1000) * 100)} 
                  className="h-2"
                />
              </div>

              {/* CPU Usage */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span className="text-sm font-medium">CPU</span>
                </div>
                <div className="text-2xl font-bold">{metrics.cpuUsage.toFixed(0)}%</div>
                <Progress 
                  value={metrics.cpuUsage} 
                  className="h-2"
                />
              </div>

              {/* Render Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">Render</span>
                </div>
                <div className="text-2xl font-bold">{metrics.renderTime.toFixed(1)}ms</div>
                <Progress 
                  value={Math.min(100, (metrics.renderTime / 32) * 100)} 
                  className="h-2"
                />
              </div>
            </div>

            {/* Stream Information */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="text-sm font-medium">Stream Status</div>
                <div className="text-xs text-muted-foreground">
                  {metrics.activeStreams} active / {metrics.streamCount} total
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={forceCleanup}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Cleanup
              </Button>
            </div>

            {/* Optimization Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-orange-600">
                  Performance Suggestions:
                </div>
                <ul className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <li 
                      key={index} 
                      className="text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <div className="w-1 h-1 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Monitoring Status */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Monitoring: {isMonitoring ? "Active" : "Inactive"}
              </span>
              <span>
                Updated every 2 seconds
              </span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
