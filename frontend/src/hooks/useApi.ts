import useSWR from "swr";
import { toast } from "sonner";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json();
};

export function useApi<T>(endpoint: string | null, refreshInterval = 5000) {
  // Only construct the API endpoint if endpoint is provided
  const apiEndpoint = endpoint
    ? endpoint.startsWith("/api")
      ? endpoint
      : `/api${endpoint}`
    : null;

  const { data, error, mutate } = useSWR<T>(apiEndpoint, fetcher, {
    refreshInterval,
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  return {
    data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
