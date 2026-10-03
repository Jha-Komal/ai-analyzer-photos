import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartWrapper({ title, children, height = "h-72" }: { title: string; children: ReactNode; height?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className={height}>{children}</CardContent>
    </Card>
  );
}
