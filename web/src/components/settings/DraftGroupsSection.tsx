import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DraftGroupsSection() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Draft Groups</CardTitle>
        <CardDescription className="text-sm">
          View and manage draft groups.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-center py-6 text-muted-foreground text-sm">
          Draft Groups section coming soon
        </div>
      </CardContent>
    </Card>
  );
}
