"use client";

// 경로: src/components/design/export/buildPrintDocument.ts
//
// 설계 문서를 인쇄용 HTML 한 장으로 엮는다.
//
// 발표 자료와 제출물로 쓰이는 결과물이라, 화면에서 본 것과 같은 내용이
// 같은 순서로 나와야 한다. 그림은 실제 캔버스를 캡처한 것을 그대로 넣는다.

import type { DesignModel } from "../model/schema";

const PRIORITY_LABEL: Record<string, string> = {
  must: "필수",
  should: "권장",
  could: "선택",
};

const ROLE_LABEL: Record<string, string> = {
  page: "화면",
  modal: "팝업",
  external: "외부",
};

export interface PrintImages {
  screens: string | null;
  erd: string | null;
}

function escapeHtml(raw: string): string {
  return (raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dateLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
}

function section(title: string, body: string): string {
  return body.trim()
    ? `<section><h2>${escapeHtml(title)}</h2>${body}</section>`
    : `<section><h2>${escapeHtml(title)}</h2><p class="empty">아직 작성된 내용이 없습니다.</p></section>`;
}

function table(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return "";
  }

  const head = headers.map((value) => `<th>${escapeHtml(value)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function requirementsSection(model: DesignModel): string {
  const rows = model.requirements.map((requirement) => [
    escapeHtml(requirement.code),
    escapeHtml(requirement.category),
    escapeHtml(requirement.name),
    escapeHtml(requirement.description),
    escapeHtml(PRIORITY_LABEL[requirement.priority] ?? requirement.priority),
    `화면 ${requirement.screenIds.length} · API ${requirement.apiIds.length}`,
  ]);

  return section(
    "1. 요구사항",
    table(["번호", "분류", "이름", "설명", "우선순위", "연결"], rows),
  );
}

function screensSection(model: DesignModel, image: string | null): string {
  const screenNameById = new Map(model.screens.map((screen) => [screen.id, screen.name]));

  const screenRows = model.screens.map((screen) => [
    escapeHtml(screen.name),
    escapeHtml(screen.key),
    escapeHtml(ROLE_LABEL[screen.role] ?? screen.role),
    screen.isEntry ? "시작 화면" : "",
    screen.requiresAuth ? "로그인 필요" : "",
    escapeHtml(screen.description),
  ]);

  const transitionRows = model.screenTransitions.map((transition) => [
    escapeHtml(screenNameById.get(transition.from) ?? "?"),
    escapeHtml(screenNameById.get(transition.to) ?? "?"),
    escapeHtml(transition.trigger),
    escapeHtml(transition.condition),
  ]);

  const picture = image
    ? `<figure><img src="${image}" alt="화면 흐름도" /></figure>`
    : "";

  return section(
    "2. 화면 흐름",
    picture +
      table(["화면", "경로", "종류", "시작", "인증", "설명"], screenRows) +
      (transitionRows.length > 0
        ? `<h3>화면 이동</h3>${table(["에서", "으로", "행동", "조건"], transitionRows)}`
        : ""),
  );
}

function erdSection(model: DesignModel, image: string | null): string {
  const tableNameById = new Map(model.erd.tables.map((item) => [item.id, item.name]));

  const picture = image ? `<figure><img src="${image}" alt="ERD" /></figure>` : "";

  const tables = model.erd.tables
    .map((item) => {
      const rows = item.columns.map((column) => [
        escapeHtml(column.name),
        escapeHtml(column.length ? `${column.type}(${column.length})` : column.type),
        column.isPk ? "PK" : column.isFk ? "FK" : "",
        column.nullable ? "" : "필수",
        escapeHtml(column.comment),
      ]);

      return `<h3>${escapeHtml(item.name)}${
        item.description ? ` — ${escapeHtml(item.description)}` : ""
      }</h3>${table(["컬럼", "타입", "키", "필수", "설명"], rows)}`;
    })
    .join("");

  const relationRows = model.erd.relations.map((relation) => [
    escapeHtml(tableNameById.get(relation.fromTableId) ?? "?"),
    escapeHtml(tableNameById.get(relation.toTableId) ?? "?"),
    escapeHtml(relation.cardinality),
    escapeHtml(relation.note),
  ]);

  return section(
    "3. 데이터베이스 설계",
    picture +
      tables +
      (relationRows.length > 0
        ? `<h3>표 사이의 관계</h3>${table(["에서", "으로", "관계", "설명"], relationRows)}`
        : ""),
  );
}

function apisSection(model: DesignModel): string {
  const rows = model.apis.map((api) => [
    `<code>${escapeHtml(api.method)}</code>`,
    `<code>${escapeHtml(api.endpoint)}</code>`,
    escapeHtml(api.description),
    api.auth ? "필요" : "",
    `<pre>${escapeHtml(api.request)}</pre>`,
    `<pre>${escapeHtml(api.response)}</pre>`,
  ]);

  return section(
    "4. API 명세",
    table(["메서드", "주소", "설명", "인증", "요청", "응답"], rows),
  );
}

export function buildPrintDocument(
  model: DesignModel,
  workspaceName: string,
  images: PrintImages,
): string {
  const stack = [model.meta.techStack.backend, model.meta.techStack.frontend, model.meta.techStack.db]
    .filter(Boolean)
    .join(" · ");

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(workspaceName || "설계 문서")}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Pretendard", "Malgun Gothic", system-ui, sans-serif;
    color: #0f172a;
    font-size: 11px;
    line-height: 1.6;
  }
  header.cover { padding: 24px 0 16px; border-bottom: 2px solid #0f172a; margin-bottom: 24px; }
  header.cover h1 { margin: 0 0 6px; font-size: 24px; }
  header.cover p { margin: 2px 0; color: #475569; font-size: 12px; }
  section { margin-bottom: 28px; page-break-inside: avoid; }
  h2 { font-size: 15px; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #cbd5e1; }
  h3 { font-size: 12px; margin: 14px 0 6px; color: #334155; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: 600; white-space: nowrap; }
  td pre { margin: 0; white-space: pre-wrap; word-break: break-all; font-size: 10px; color: #475569; }
  code { font-family: ui-monospace, monospace; font-size: 10px; }
  figure { margin: 0 0 12px; page-break-inside: avoid; }
  figure img { width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; }
  p.empty { color: #94a3b8; }
</style>
</head>
<body>
<header class="cover">
  <h1>${escapeHtml(workspaceName || "설계 문서")}</h1>
  ${model.meta.projectSummary ? `<p>${escapeHtml(model.meta.projectSummary)}</p>` : ""}
  ${stack ? `<p>${escapeHtml(stack)}</p>` : ""}
  <p>${dateLabel()} · 요구사항 ${model.requirements.length} · 화면 ${model.screens.length} · 표 ${
    model.erd.tables.length
  } · API ${model.apis.length}</p>
</header>
${requirementsSection(model)}
${screensSection(model, images.screens)}
${erdSection(model, images.erd)}
${apisSection(model)}
</body>
</html>`;
}
