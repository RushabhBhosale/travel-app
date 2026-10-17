import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, getErrorMessage } from "./api";
import { toast } from "../components/ui/Toast";
import type { Trip } from "./types";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 2,
      retryDelay: (n) => Math.min(1500 * 2 ** n, 8000),
    },
  },
});

// Cached trips are shown instantly on launch while fresh data loads.
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "wayfare-query-cache",
  throttleTime: 2000,
});

export const keys = {
  trips: ["trips"] as const,
  trip: (id: string) => ["trip", id] as const,
};

export function useTrips(enabled = true) {
  return useQuery({ queryKey: keys.trips, queryFn: api.listTrips, enabled });
}

export function useTrip(id: string, initial?: Trip) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: keys.trip(id),
    queryFn: () => api.getTrip(id),
    enabled: !!id,
    initialData: () => initial ?? qc.getQueryData<Trip[]>(keys.trips)?.find((t) => t._id === id),
    initialDataUpdatedAt: 0,
  });
}

export function useSetTrip() {
  const qc = useQueryClient();
  return (trip: Trip) => {
    qc.setQueryData(keys.trip(trip._id), trip);
    qc.setQueryData<Trip[]>(keys.trips, (old) =>
      old ? (old.some((t) => t._id === trip._id) ? old.map((t) => (t._id === trip._id ? trip : t)) : [...old, trip]) : [trip]
    );
  };
}

/**
 * Mutation for any endpoint that returns the updated trip. Optionally applies
 * an optimistic update first and rolls it back on failure.
 */
export function useTripMutation<V>(
  tripId: string,
  fn: (vars: V) => Promise<Trip>,
  opts: { optimistic?: (trip: Trip, vars: V) => Trip; success?: string } = {}
) {
  const qc = useQueryClient();
  const setTrip = useSetTrip();
  return useMutation({
    mutationFn: fn,
    onMutate: async (vars: V) => {
      if (!opts.optimistic) return undefined;
      await qc.cancelQueries({ queryKey: keys.trip(tripId) });
      const previous = qc.getQueryData<Trip>(keys.trip(tripId));
      if (previous) setTrip(opts.optimistic(previous, vars));
      return previous;
    },
    onSuccess: (trip) => {
      setTrip(trip);
      if (opts.success) toast.success(opts.success);
    },
    onError: (err, _vars, previous) => {
      if (previous) setTrip(previous);
      toast.error(getErrorMessage(err));
    },
  });
}

export function useDeleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTrip(id),
    onSuccess: (_r, id) => {
      qc.setQueryData<Trip[]>(keys.trips, (old) => old?.filter((t) => t._id !== id));
      qc.removeQueries({ queryKey: keys.trip(id) });
      toast.success("Trip deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
}
