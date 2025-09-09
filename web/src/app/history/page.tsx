"use client";

import { redirect } from "next/navigation";

export default function HistoryPage() {
  redirect("/scoreboard");
  return null;
}
