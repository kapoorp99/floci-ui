import { apiClient, apiEndpointKeys } from "@/api/api";
import type {
  CWAlarm,
  CWLogEvent,
  CWLogGroup,
  CWLogStream,
  CWMetric,
  ResourceSummary,
} from "@/api/types";

export type CreateLogGroupInput = {
  name: string;
  retentionInDays?: number;
};

export type CreateLogStreamInput = {
  group: string;
  name: string;
};

export type PutLogEventsInput = {
  group: string;
  stream: string;
  events: Array<{ timestamp: number; message: string }>;
};

export async function listLogGroups(
  prefix?: string,
  signal?: AbortSignal,
): Promise<CWLogGroup[]> {
  const res = await apiClient.call<CWLogGroup[]>(
    apiEndpointKeys.aws.cloudwatch.logGroups.list,
    {
      signal,
      params: { prefix },
    },
  );

  return res.data;
}

export async function createLogGroup(
  name: string,
  retentionInDays?: number,
): Promise<void> {
  await apiClient.call<void, CreateLogGroupInput>(
    apiEndpointKeys.aws.cloudwatch.logGroups.create,
    {
      body: { name, retentionInDays },
    },
  );
}

export async function deleteLogGroup(name: string): Promise<void> {
  await apiClient.call<void>(
    apiEndpointKeys.aws.cloudwatch.logGroups.delete,
    {
      params: { name },
    },
  );
}

export async function listLogStreams(
  group: string,
  signal?: AbortSignal,
): Promise<CWLogStream[]> {
  if (!group) return [];

  const res = await apiClient.call<CWLogStream[]>(
    apiEndpointKeys.aws.cloudwatch.logStreams.list,
    {
      signal,
      params: { group },
    },
  );

  return res.data;
}

export async function createLogStream(
  group: string,
  name: string,
): Promise<void> {
  await apiClient.call<void, CreateLogStreamInput>(
    apiEndpointKeys.aws.cloudwatch.logStreams.create,
    {
      body: { group, name },
    },
  );
}

export async function deleteLogStream(
  group: string,
  stream: string,
): Promise<void> {
  await apiClient.call<void>(
    apiEndpointKeys.aws.cloudwatch.logStreams.delete,
    {
      params: { group, stream },
    },
  );
}

export async function getLogEvents(
  group: string,
  stream: string,
  signal?: AbortSignal,
): Promise<CWLogEvent[]> {
  if (!group || !stream) return [];

  const res = await apiClient.call<CWLogEvent[]>(
    apiEndpointKeys.aws.cloudwatch.logEvents.list,
    {
      signal,
      params: { group, stream },
    },
  );

  return res.data;
}

export async function putLogEvents(
  group: string,
  stream: string,
  events: Array<{ timestamp: number; message: string }>,
): Promise<void> {
  await apiClient.call<void, PutLogEventsInput>(
    apiEndpointKeys.aws.cloudwatch.logEvents.put,
    {
      body: { group, stream, events },
    },
  );
}

export async function listAlarms(signal?: AbortSignal): Promise<CWAlarm[]> {
  const res = await apiClient.call<CWAlarm[]>(
    apiEndpointKeys.aws.cloudwatch.alarms.list,
    { signal },
  );

  return res.data;
}

export async function listMetrics(signal?: AbortSignal): Promise<CWMetric[]> {
  const res = await apiClient.call<CWMetric[]>(
    apiEndpointKeys.aws.cloudwatch.metrics.list,
    { signal },
  );

  return res.data;
}

export async function listCloudWatchResources(
  signal?: AbortSignal,
): Promise<ResourceSummary[]> {
  const [groups, alarms, metrics] = await Promise.all([
    listLogGroups(undefined, signal).catch(() => []),
    listAlarms(signal).catch(() => []),
    listMetrics(signal).catch(() => []),
  ]);

  return [
    ...groups.map((group) => ({
      id: `log-group:${group.name}`,
      name: group.name,
      status: "log group",
      metadata: { storedBytes: group.storedBytes, createdAt: group.createdAt },
    })),
    ...alarms.map((alarm) => ({
      id: `alarm:${alarm.alarmName}`,
      name: alarm.alarmName,
      status: alarm.stateValue,
      metadata: {
        metricName: alarm.metricName,
        namespace: alarm.namespace,
        threshold: alarm.threshold,
      },
    })),
    ...metrics.map((metric) => ({
      id: `metric:${metric.id}`,
      name: `${metric.namespace}/${metric.metricName}`,
      status: "metric",
      metadata: { dimensions: metric.dimensions.length },
    })),
  ];
}

export const cloudWatchClient = {
  listLogGroups,
  createLogGroup,
  deleteLogGroup,
  listLogStreams,
  createLogStream,
  deleteLogStream,
  getLogEvents,
  putLogEvents,
  listAlarms,
  listMetrics,
  listResources: listCloudWatchResources,
};
