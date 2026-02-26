// 일정관리 페이지 상단 타이틀/설명 + '오늘/일정추가' 액션 버튼을 렌더링하는 컴포넌트

"use client";

import { Button } from "@/components/ui/button";

type Props = {
  onToday: () => void;
  onCreate: () => void;
};

export default function TopBar({ onToday, onCreate }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h1 className="text-2xl font-bold">일정 관리</h1>
        <p className="text-muted-foreground">
          개인/팀 일정을 분리하고, 날짜 클릭 시 오른쪽에서 상세를 관리합니다.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onToday}>
          오늘
        </Button>
        <Button onClick={onCreate}>+ 일정 추가</Button>
      </div>
    </div>
  );
}
