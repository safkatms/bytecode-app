import React from "react";
import { checkIn } from "@/lib/api/attendance-employee.api";
import { CheckScreen } from "@/components/attendance/CheckScreen";

export default function CheckInScreen() {
  return <CheckScreen variant="in" submit={checkIn} />;
}
