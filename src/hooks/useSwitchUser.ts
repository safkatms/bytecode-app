import { useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken } from "@/lib/axios";
import { switchUser } from "@/lib/api/auth.api";
import { useAuthStore } from "@/store/auth.store";

/**
 * Admin "view the app as another user". Remembers the admin's own session so
 * Settings → "Exit impersonation" can restore it, swaps in the target user's
 * token, clears cached data and lands on the dashboard.
 *
 * `onError` is optional: with none, a failure just rolls the impersonation back.
 */
export function useSwitchUser() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, setUser, setOriginalAdmin, setAdminToken, clearImpersonation } =
    useAuthStore();
  const [switchingId, setSwitchingId] = useState<number | null>(null);

  const switchTo = async (
    targetUserId: number,
    onError?: (error: unknown) => void,
  ) => {
    setSwitchingId(targetUserId);
    try {
      const adminToken = await getAccessToken();
      setOriginalAdmin(user);
      setAdminToken(adminToken);

      const impersonated = await switchUser(targetUserId);
      setUser(impersonated);
      await queryClient.invalidateQueries();
      router.replace("/(app)/dashboard");
    } catch (error) {
      clearImpersonation();
      onError?.(error);
    } finally {
      setSwitchingId(null);
    }
  };

  return { switchTo, switchingId };
}
