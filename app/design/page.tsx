// 경로: app/design/page.tsx
//
// 설계 관리 진입점. 화면 구성은 features/design 아래에 있다.
//
// 예전에는 이 파일 하나에 네 탭과 PDF 생성, 사이드바, 커스텀 노드까지
// 2,898줄이 들어 있었다.

import { Suspense } from "react";

import { DesignWorkspace } from "@/features/design/components/DesignWorkspace";

export default function DesignPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">불러오는 중…</div>}>
      <DesignWorkspace />
    </Suspense>
  );
}
