import React from "react";
import { checkOut } from "@/lib/api/attendance-employee.api";
import { CheckScreen } from "@/components/attendance/CheckScreen";

export default function CheckOutScreen() {
  return <CheckScreen variant="out" submit={checkOut} />;
}
