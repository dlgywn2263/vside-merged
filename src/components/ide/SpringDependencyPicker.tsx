"use client";

// 경로: src/components/ide/SpringDependencyPicker.tsx
//
// 스프링부트 작업 폴더를 만들 때 넣을 의존성을 고른다. Spring Initializr 의 "Dependencies" 와 같은 역할이다.
// 고른 것은 서버가 build.gradle 에 넣고, JPA 와 DB 를 함께 고르면 application.yml 도 만든다.
// 생김새는 같은 단계의 "GitHub 저장소 연결" 영역(구분선 + 작은 선택 행)에 맞춘다.
//
// id 는 백엔드 SpringDependency 의 이름과 글자까지 같아야 한다. 서버는 이 목록에 없는 이름을 거절한다
// (사용자가 보낸 글자를 build.gradle 에 그대로 넣으면 아무 코드나 끼워 넣을 수 있기 때문이다).

import { AlertTriangle, Check, Database, Info } from "lucide-react";

export type SpringDependencyId = "JPA" | "H2" | "MYSQL" | "LOMBOK" | "VALIDATION";

const OPTIONS: { id: SpringDependencyId; name: string; group: string; desc: string }[] = [
  { id: "JPA", name: "Spring Data JPA", group: "DB", desc: "엔티티·리포지토리로 DB 를 다룹니다. 설계관리 코드 생성이 씁니다." },
  { id: "H2", name: "H2 Database", group: "DB", desc: "설치가 필요 없는 메모리 DB. 바로 실행되고, 멈추면 데이터가 사라집니다." },
  { id: "MYSQL", name: "MySQL Driver", group: "DB", desc: "MySQL 에 접속합니다. 접속할 MySQL 서버가 따로 있어야 합니다." },
  { id: "LOMBOK", name: "Lombok", group: "도구", desc: "@Getter, @Builder 등으로 반복 코드를 줄입니다." },
  { id: "VALIDATION", name: "Validation", group: "웹", desc: "@NotBlank, @Valid 로 요청 값을 검사합니다." },
];

const DB_IDS: SpringDependencyId[] = ["H2", "MYSQL"];

/** application.yml 이 함께 만들어지는지. 백엔드 SpringAppConfig.render 와 같은 조건이다. */
export function createsAppConfig(selected: SpringDependencyId[]) {
  return selected.includes("JPA") && selected.some((id) => DB_IDS.includes(id));
}

export default function SpringDependencyPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: SpringDependencyId[];
  onChange: (next: SpringDependencyId[]) => void;
  disabled?: boolean;
}) {
  const toggle = (id: SpringDependencyId) => {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }

    const next = [...value, id];

    // JPA 는 붙을 DB 가 없으면 서버가 뜨다가 죽는다. DB 를 아직 안 골랐으면 바로 도는 H2 를 같이 켠다.
    // 원하지 않으면 사용자가 끄면 된다.
    if (id === "JPA" && !value.some((item) => DB_IDS.includes(item))) {
      next.push("H2");
    }

    onChange(next);
  };

  const hasJpa = value.includes("JPA");
  const hasDb = value.some((id) => DB_IDS.includes(id));
  const mysqlOnly = hasJpa && value.includes("MYSQL") && !value.includes("H2");

  return (
    <section className="border-t border-[#E5EAF3] pt-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#334155]">
            의존성 추가 <span className="text-xs font-normal text-[#94A3B8]">(선택)</span>
          </h2>
          <p className="mt-0.5 text-xs text-[#94A3B8]">
            고른 것은 build.gradle 에 자동으로 들어갑니다. 고르지 않아도 됩니다.
          </p>
        </div>

        <span className="inline-flex h-7 shrink-0 items-center rounded-md bg-[#EEF3FF] px-2.5 text-xs font-semibold text-[#5873F9]">
          {value.length}개 선택
        </span>
      </div>

      <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-[#F7F8FA] px-3 py-2">
        <Database size={15} className="shrink-0 text-[#5873F9]" />
        <span className="text-[13px] font-semibold text-[#111827]">Spring Web</span>
        <span className="ml-auto rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] ring-1 ring-inset ring-[#E5EAF3]">기본 포함</span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const checked = value.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(option.id)}
              aria-pressed={checked}
              className={[
                "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                checked
                  ? "border-[#5873F9] bg-[#F5F8FF]"
                  : "border-[#E5EAF3] bg-white hover:border-[#C9D4FF]",
              ].join(" ")}
            >
              <span
                className={[
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  checked ? "border-[#5873F9] bg-[#5873F9] text-white" : "border-[#CBD5E1] bg-white",
                ].join(" ")}
              >
                {checked ? <Check size={11} strokeWidth={3} /> : null}
              </span>

              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-[#111827]">{option.name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B]">
                    {option.group}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-4 text-[#94A3B8]">{option.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {hasJpa && !hasDb ? (
        <p className="mt-2.5 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          JPA 는 DB 가 있어야 실행됩니다. H2 나 MySQL 중 하나를 골라 주세요. 안 고르면 실행할 때 서버가 뜨지 않습니다.
        </p>
      ) : mysqlOnly ? (
        <p className="mt-2.5 flex items-start gap-2 rounded-lg bg-amber-50/70 px-3 py-2 text-xs font-semibold leading-5 text-amber-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          MySQL 만 고르면 application.yml 에 MySQL 서버 주소·계정을 직접 채워야 실행됩니다. 바로 실행하려면 H2 도 고르세요.
        </p>
      ) : createsAppConfig(value) ? (
        <p className="mt-2.5 flex items-start gap-2 rounded-lg bg-[#F5F8FF] px-3 py-2 text-xs font-medium leading-5 text-[#4A63E0]">
          <Info size={15} className="mt-0.5 shrink-0" />
          H2 메모리 DB 로 바로 실행되도록 application.yml 도 함께 만듭니다.
        </p>
      ) : null}
    </section>
  );
}
