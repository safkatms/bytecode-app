import { useAuthStore } from "@/store/auth.store";
import { Redirect } from "expo-router";

export default function DashboardIndex() {
  const { user } = useAuthStore();
  return user?.role === "admin" ? (
    <Redirect href="/(app)/admin/dashboard" />
  ) : (
    <Redirect href="/(app)/employee/dashboard" />
  );
}
