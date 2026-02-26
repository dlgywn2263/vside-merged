// 모드에 따라 '팀 정보' 또는 '개인 요약'을 보여주는 우측 하단 카드 컴포넌트

"use client";

import type { Mode, Team } from "./schedule.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type Props = {
  mode: Mode;

  currentTeam?: Team;
  personalNextTitle: string;
  monthTopCategory: string;

  onQuickCreate: () => void;
};

export default function SideInfoCard({
  mode,
  currentTeam,
  personalNextTitle,
  monthTopCategory,
  onQuickCreate,
}: Props) {
  if (mode === "team") {
    return (
      <Card className="rounded-2xl h-full">
        <CardHeader>
          <CardTitle>팀 정보</CardTitle>
          <CardDescription>{currentTeam?.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {currentTeam?.members.map((m) => (
              <Badge key={m.id} variant="outline">
                {m.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl h-full">
      <CardHeader>
        <CardTitle>개인 요약</CardTitle>
        <CardDescription>빠른 확인용</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">다음 일정</div>
          <div className="text-sm font-medium">{personalNextTitle}</div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-xs text-muted-foreground">
            이번 달 최다 카테고리
          </div>
          <div className="text-sm font-medium">{monthTopCategory}</div>
        </div>

        <Button variant="outline" onClick={onQuickCreate}>
          + 일정 빠르게 추가
        </Button>
      </CardContent>
    </Card>
  );
}
