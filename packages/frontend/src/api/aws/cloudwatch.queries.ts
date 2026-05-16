import { useQuery } from "@tanstack/react-query";
import { cloudWatchClient } from "./cloudwatch.api";

export const cloudWatchQueryKeys = {
  logGroups: (prefix: string) => ["cloudwatch", "groups", prefix] as const,
  alarms: ["cloudwatch", "alarms"] as const,
  metrics: ["cloudwatch", "metrics"] as const,
  logStreams: (group: string | null) => ["cloudwatch", "streams", group] as const,
  logEvents: (group: string | null, stream: string | null) =>
    ["cloudwatch", "events", group, stream] as const,
};

export function useLogGroupsQuery(prefix: string) {
  return useQuery({
    queryKey: cloudWatchQueryKeys.logGroups(prefix),
    queryFn: ({ signal }) =>
      cloudWatchClient.listLogGroups(prefix || undefined, signal),
    refetchInterval: 10_000,
  });
}

export function useAlarmsQuery() {
  return useQuery({
    queryKey: cloudWatchQueryKeys.alarms,
    queryFn: ({ signal }) => cloudWatchClient.listAlarms(signal),
    refetchInterval: 30_000,
  });
}

export function useMetricsQuery() {
  return useQuery({
    queryKey: cloudWatchQueryKeys.metrics,
    queryFn: ({ signal }) => cloudWatchClient.listMetrics(signal),
    refetchInterval: 30_000,
  });
}

export function useLogStreamsQuery(group: string | null) {
  return useQuery({
    queryKey: cloudWatchQueryKeys.logStreams(group),
    queryFn: ({ signal }) => cloudWatchClient.listLogStreams(group!, signal),
    enabled: Boolean(group),
    refetchInterval: 10_000,
  });
}

export function useLogEventsQuery(
  group: string | null,
  stream: string | null,
) {
  return useQuery({
    queryKey: cloudWatchQueryKeys.logEvents(group, stream),
    queryFn: ({ signal }) =>
      cloudWatchClient.getLogEvents(group!, stream!, signal),
    enabled: Boolean(group && stream),
    refetchInterval: 10_000,
  });
}
