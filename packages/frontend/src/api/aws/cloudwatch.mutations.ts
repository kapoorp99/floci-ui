import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { cloudWatchClient } from "./cloudwatch.api";
import { cloudWatchQueryKeys } from "./cloudwatch.queries";

export type CreateLogGroupMutationInput = {
  name: string;
  retentionInDays?: number;
};

export type CreateLogStreamMutationInput = {
  group: string;
  name: string;
};

export type DeleteLogStreamMutationInput = {
  group: string;
  stream: string;
};

export type PutLogEventsMutationInput = {
  group: string;
  stream: string;
  events: Array<{ timestamp: number; message: string }>;
};

export function useCreateLogGroupMutation(
  options?: UseMutationOptions<void, Error, CreateLogGroupMutationInput>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, retentionInDays }) =>
      cloudWatchClient.createLogGroup(name, retentionInDays),
    ...options,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["cloudwatch", "groups"] });
      options?.onSuccess?.(...args);
    },
  });
}

export function useDeleteLogGroupMutation(
  options?: UseMutationOptions<void, Error, string>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name) => cloudWatchClient.deleteLogGroup(name),
    ...options,
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: ["cloudwatch", "groups"] });
      options?.onSuccess?.(...args);
    },
  });
}

export function useCreateLogStreamMutation(
  options?: UseMutationOptions<void, Error, CreateLogStreamMutationInput>,
) {
  return useMutation({
    mutationFn: ({ group, name }) => cloudWatchClient.createLogStream(group, name),
    ...options,
  });
}

export function useDeleteLogStreamMutation(
  options?: UseMutationOptions<void, Error, DeleteLogStreamMutationInput>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ group, stream }) =>
      cloudWatchClient.deleteLogStream(group, stream),
    ...options,
    onSuccess: (...args) => {
      const [, variables] = args;
      void queryClient.invalidateQueries({
        queryKey: cloudWatchQueryKeys.logStreams(variables.group),
      });
      options?.onSuccess?.(...args);
    },
  });
}

export function usePutLogEventsMutation(
  options?: UseMutationOptions<void, Error, PutLogEventsMutationInput>,
) {
  return useMutation({
    mutationFn: ({ group, stream, events }) =>
      cloudWatchClient.putLogEvents(group, stream, events),
    ...options,
  });
}
