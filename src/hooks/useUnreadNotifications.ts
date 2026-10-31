import { useQuery } from "@tanstack/react-query";
import { getUnreadCount } from "@/lib/api/notification.api";

export function useUnreadNotifications() {
  const { data } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
  });
  return data ?? 0;
}
