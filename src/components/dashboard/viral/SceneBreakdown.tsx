import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CopyButton } from "./CopyButton";
import type { SceneRow } from "./types";

interface SceneBreakdownProps {
  scenes: SceneRow[];
}

export function SceneBreakdown({ scenes }: SceneBreakdownProps) {
  const fullScript = scenes.map((s) => s.script).join("\n\n");

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>🎬</span> Scene-by-Scene Blueprint
          </CardTitle>
          <CopyButton text={fullScript} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="w-[90px] text-xs">Time</TableHead>
              <TableHead className="text-xs">Script / Dialogue</TableHead>
              <TableHead className="text-xs w-[35%]">Visual / Effect Cue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scenes.map((scene, i) => (
              <TableRow key={i} className="border-border">
                <TableCell className="font-mono text-xs text-cyan-400 whitespace-nowrap align-top pt-3">
                  {scene.time}
                </TableCell>
                <TableCell className="text-sm leading-relaxed align-top pt-3 whitespace-pre-wrap">
                  {scene.script}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground align-top pt-3 whitespace-pre-wrap">
                  {scene.visual}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
