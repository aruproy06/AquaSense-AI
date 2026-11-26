import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { runMlAnalysis } from "@/lib/server-fns";

const asItems = (page) => (Array.isArray(page) ? page : (page?.items ?? []));

export function useReadings({ deviceId = "", limit = 288 } = {}) {
  return useQuery({
    queryKey: ["readings", deviceId, limit],
    queryFn: async () => asItems(await base44.entities.WaterReading.filter(deviceId ? { device_id: deviceId } : {}, { sort: "-recorded_at", limit })),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });
}

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: async () => asItems(await base44.entities.Device.filter({}, { sort: "-created_date", limit: 20 })),
    refetchInterval: 30000,
  });
}

export function useAlerts(limit = 50) {
  return useQuery({
    queryKey: ["alerts", limit],
    queryFn: async () => asItems(await base44.entities.Alert.filter({}, { sort: "-created_date", limit })),
    refetchInterval: 20000,
  });
}

export function useOpenAlertCount() {
  return useQuery({
    queryKey: ["alerts", "open-count"],
    queryFn: () => base44.entities.Alert.count({ status: "open" }),
    refetchInterval: 20000,
  });
}

export function useUploads(limit = 20) {
  return useQuery({
    queryKey: ["uploads", limit],
    queryFn: async () => asItems(await base44.entities.Upload.filter({}, { sort: "-created_date", limit })),
  });
}

export function useMlAnalysis(deviceId = "") {
  return useQuery({
    queryKey: ["ml", deviceId],
    queryFn: () => runMlAnalysis({ data: { device_id: deviceId } }),
    staleTime: 60000,
    refetchInterval: 60000,
  });
}
