"use client";

import { useEffect } from "react";
import type React from "react";

import {
  CalendarDays,
  Check,
  ChevronDown,
  CircleDot,
  FilePenLine,
  FolderOpen,
  Link2,
  Loader2,
  X,
} from "lucide-react";

import type { ScheduleOption } from "../devlog.types";

type StatusChange =
  | "none"
  | "progress"
  | "done";

type CreateDevlogModalProps = {
  mode?: "create" | "edit";

  selectedProjectName: string;

  visibleSchedules: ScheduleOption[];

  formTitle: string;
  formContent: string;
  formDate: string;
  formScheduleId: string;
  formStatusChange: StatusChange;

  saving: boolean;

  onChangeTitle: (
    value: string,
  ) => void;

  onChangeContent: (
    value: string,
  ) => void;

  onChangeDate: (
    value: string,
  ) => void;

  onChangeScheduleId: (
    value: string,
  ) => void;

  onChangeStatus: (
    value: StatusChange,
  ) => void;

  onClose: () => void;

  onSubmit: () => void;
};

const scheduleStatusLabel: Record<
  string,
  string
> = {
  todo: "할 일",
  progress: "진행 중",
  done: "완료",
  delayed: "지연",
};

const scheduleStatusStyle: Record<
  string,
  string
> = {
  todo:
    "bg-slate-100 text-slate-600",

  progress:
    "bg-[#EEF3FF] text-[#5873F9]",

  done:
    "bg-emerald-50 text-emerald-700",

  delayed:
    "bg-rose-50 text-rose-600",
};

function cn(
  ...classes: Array<
    string | false | null | undefined
  >
) {
  return classes
    .filter(Boolean)
    .join(" ");
}

function formatDate(
  value?: string,
) {
  if (!value) {
    return "-";
  }

  const [
    year,
    month,
    date,
  ] = value.split("-");

  if (
    !year ||
    !month ||
    !date
  ) {
    return value;
  }

  return `${year}.${month}.${date}`;
}

function getSchedulePeriod(
  schedule?: ScheduleOption,
) {
  if (!schedule) {
    return "";
  }

  if (
    schedule.startDate ===
    schedule.endDate
  ) {
    return formatDate(
      schedule.startDate,
    );
  }

  return `${formatDate(
    schedule.startDate,
  )} ~ ${formatDate(
    schedule.endDate,
  )}`;
}

export function CreateDevlogModal({
  mode = "create",

  selectedProjectName,

  visibleSchedules,

  formTitle,
  formContent,
  formDate,
  formScheduleId,
  formStatusChange,

  saving,

  onChangeTitle,
  onChangeContent,
  onChangeDate,
  onChangeScheduleId,
  onChangeStatus,

  onClose,
  onSubmit,
}: CreateDevlogModalProps) {
  const selectedSchedule =
    visibleSchedules.find(
      (schedule) =>
        schedule.id ===
        formScheduleId,
    );

  const isEdit =
    mode === "edit";

  /* =========================================================
     BACKGROUND SCROLL LOCK

     모달이 열려 있는 동안
     뒤쪽 페이지의 스크롤만 제거합니다.

     모달 내부 스크롤은 아래의
     overflow-y-auto에서 그대로 동작합니다.
     ========================================================= */

  useEffect(() => {
    const html =
      document.documentElement;

    const body =
      document.body;

    const previousHtmlOverflow =
      html.style.overflow;

    const previousBodyOverflow =
      body.style.overflow;

    const previousBodyPaddingRight =
      body.style.paddingRight;

    /*
     * 브라우저 스크롤바가 사라지면서
     * 화면이 좌우로 살짝 움직이는 것 방지
     */
    const scrollbarWidth =
      window.innerWidth -
      html.clientWidth;

    html.style.overflow =
      "hidden";

    body.style.overflow =
      "hidden";

    if (scrollbarWidth > 0) {
      body.style.paddingRight =
        `${scrollbarWidth}px`;
    }

    return () => {
      html.style.overflow =
        previousHtmlOverflow;

      body.style.overflow =
        previousBodyOverflow;

      body.style.paddingRight =
        previousBodyPaddingRight;
    };
  }, []);

  return (
    <>
      {/* =================================================
          FULL SCREEN BACKDROP

          화면 전체를 덮기 때문에
          상단 WAIVS 헤더까지 블러 처리됨
         ================================================= */}

      <div
        className="fixed inset-0 z-[9998] bg-slate-950/30 backdrop-blur-[2px]"
        onMouseDown={() => {
          if (!saving) {
            onClose();
          }
        }}
      />

      {/* =================================================
          MODAL POSITION AREA

          중요:
          overflow-y-auto 제거
          → 블러/페이지 영역의 별도 scrollbar 제거

          실제 스크롤은 모달 CONTENT에서만 발생
         ================================================= */}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 top-[25px] z-[9999] flex items-start justify-center overflow-hidden px-4 py-4">

        {/* =================================================
            MODAL
           ================================================= */}

        <div
          className="pointer-events-auto flex max-h-[calc(100dvh-60px)] w-full max-w-[720px] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          {/* =================================================
              HEADER
             ================================================= */}

          <header className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5873F9]">
                  Development Log
                </span>

                <span className="rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[9px] font-black text-[#5873F9]">
                  {isEdit
                    ? "EDIT"
                    : "NEW"}
                </span>
              </div>

              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                {isEdit
                  ? "개발일지 수정"
                  : "개발일지 작성"}
              </h2>

              <p className="mt-1 text-xs font-medium text-slate-400">
                프로젝트 작업 과정과 결과를
                간단하게 기록합니다.
              </p>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              aria-label="개발일지 모달 닫기"
            >
              <X size={17} />
            </button>
          </header>

          {/* =================================================
              CONTENT

              여기는 그대로 overflow-y-auto
              → 모달 내부 스크롤은 유지
             ================================================= */}

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-6 py-5">

              {/* =============================================
                  TITLE
                 ============================================= */}

              <div>
                <label className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                  Title
                </label>

                <input
                  value={formTitle}
                  onChange={(event) =>
                    onChangeTitle(
                      event.target.value,
                    )
                  }
                  placeholder="오늘 작업한 내용을 한 줄로 정리해주세요."
                  className="mt-1 w-full border-0 border-b border-slate-200 bg-transparent px-0 pb-3 pt-1 text-[19px] font-black tracking-tight text-slate-950 outline-none transition placeholder:font-semibold placeholder:text-slate-300 focus:border-[#5873F9]"
                  autoFocus
                />
              </div>

              {/* =============================================
                  META
                 ============================================= */}

              <section className="mt-5 overflow-hidden rounded-xl border border-slate-200">

                {/* PROJECT */}

                <MetaRow
                  icon={
                    <FolderOpen
                      size={15}
                    />
                  }
                  label="프로젝트"
                >
                  <span className="text-xs font-black text-slate-700">
                    {selectedProjectName}
                  </span>
                </MetaRow>

                {/* DATE */}

                <MetaRow
                  icon={
                    <CalendarDays
                      size={15}
                    />
                  }
                  label="작업일"
                >
                  <input
                    type="date"
                    value={formDate}
                    onChange={(event) =>
                      onChangeDate(
                        event.target.value,
                      )
                    }
                    className="h-8 min-w-[145px] rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-600 outline-none transition focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
                  />
                </MetaRow>

                {/* SCHEDULE */}

                <MetaRow
                  icon={
                    <Link2
                      size={15}
                    />
                  }
                  label="연결 일정"
                  alignStart
                >
                  <div className="min-w-0 flex-1">
                    <div className="relative">
                      <select
                        value={
                          formScheduleId
                        }
                        onChange={(
                          event,
                        ) => {
                          const value =
                            event.target
                              .value;

                          onChangeScheduleId(
                            value,
                          );

                          if (!value) {
                            onChangeStatus(
                              "none",
                            );
                          }
                        }}
                        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-xs font-bold text-slate-700 outline-none transition focus:border-[#AAB8FF] focus:ring-2 focus:ring-[#5873F9]/10"
                      >
                        <option value="">
                          연결하지 않음
                        </option>

                        {visibleSchedules.map(
                          (
                            schedule,
                          ) => (
                            <option
                              key={
                                schedule.id
                              }
                              value={
                                schedule.id
                              }
                            >
                              {
                                schedule.title
                              }
                            </option>
                          ),
                        )}
                      </select>

                      <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>

                    {selectedSchedule && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-md px-2 py-1 text-[9px] font-black",
                            scheduleStatusStyle[
                              selectedSchedule
                                .status
                            ] ??
                              "bg-slate-100 text-slate-500",
                          )}
                        >
                          {scheduleStatusLabel[
                            selectedSchedule
                              .status
                          ] ??
                            selectedSchedule.status}
                        </span>

                        <span className="text-[10px] font-semibold text-slate-400">
                          {getSchedulePeriod(
                            selectedSchedule,
                          )}
                        </span>

                        {!selectedSchedule.hasDevlog && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600">
                            <FilePenLine
                              size={10}
                            />

                            일지 미작성 일정
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </MetaRow>

                {/* STATUS CHANGE */}

                {formScheduleId && (
                  <MetaRow
                    icon={
                      <CircleDot
                        size={15}
                      />
                    }
                    label="일정 상태"
                    last
                  >
                    <div className="flex flex-wrap gap-1.5">
                      <StatusButton
                        active={
                          formStatusChange ===
                          "none"
                        }
                        label="변경 안 함"
                        onClick={() =>
                          onChangeStatus(
                            "none",
                          )
                        }
                      />

                      <StatusButton
                        active={
                          formStatusChange ===
                          "progress"
                        }
                        label="진행 중"
                        onClick={() =>
                          onChangeStatus(
                            "progress",
                          )
                        }
                      />

                      <StatusButton
                        active={
                          formStatusChange ===
                          "done"
                        }
                        label="완료"
                        onClick={() =>
                          onChangeStatus(
                            "done",
                          )
                        }
                      />
                    </div>
                  </MetaRow>
                )}
              </section>

              {/* =============================================
                  CONTENT EDITOR
                 ============================================= */}

              <section className="mt-5">
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                      Work Log
                    </label>

                    <p className="mt-0.5 text-xs font-bold text-slate-700">
                      작업 내용
                    </p>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-300">
                    {formContent.length}자
                  </span>
                </div>

                <textarea
                  value={
                    formContent
                  }
                  onChange={(
                    event,
                  ) =>
                    onChangeContent(
                      event.target.value,
                    )
                  }
                  placeholder={`오늘 수행한 작업을 기록해주세요.

예)
- 로그인 API 요청/응답 구현
- JWT 토큰 검증 로직 추가
- 로그인 실패 예외 처리 수정
- Postman API 테스트 완료`}
                  rows={11}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-[#FBFCFE] p-4 text-sm font-medium leading-7 text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#AAB8FF] focus:bg-white focus:ring-2 focus:ring-[#5873F9]/10"
                />
              </section>

              {/* =============================================
                  LINKED INFO
                 ============================================= */}

              {selectedSchedule && (
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#F7F9FF] px-3 py-2.5">
                  <Check
                    size={14}
                    className="mt-0.5 shrink-0 text-[#5873F9]"
                  />

                  <p className="text-[10px] font-semibold leading-5 text-slate-500">
                    저장하면{" "}

                    <strong className="text-slate-700">
                      {
                        selectedSchedule.title
                      }
                    </strong>

                    에 이 개발일지가 연결됩니다.

                    {formStatusChange !==
                      "none" && (
                      <>
                        {" "}
                        일정 상태도{" "}

                        <strong className="text-[#5873F9]">
                          {formStatusChange ===
                          "progress"
                            ? "진행 중"
                            : "완료"}
                        </strong>

                        로 변경됩니다.
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* =================================================
              FOOTER
             ================================================= */}

          <footer className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
            <p className="hidden text-[10px] font-medium text-slate-400 sm:block">
              제목, 작업일, 작업 내용은
              필수입니다.
            </p>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
              >
                취소
              </button>

              <button
                type="button"
                disabled={
                  saving ||
                  !formTitle.trim() ||
                  !formDate ||
                  !formContent.trim()
                }
                onClick={
                  onSubmit
                }
                className="inline-flex h-9 min-w-[110px] items-center justify-center gap-2 rounded-xl bg-[#5873F9] px-4 text-xs font-black text-white transition hover:bg-[#4863E8] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />

                    저장 중
                  </>
                ) : (
                  <>
                    <FilePenLine
                      size={14}
                    />

                    {isEdit
                      ? "수정 완료"
                      : "작성 완료"}
                  </>
                )}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   META ROW
   ========================================================= */

function MetaRow({
  icon,
  label,
  children,
  last,
  alignStart,
}: {
  icon: React.ReactNode;

  label: string;

  children: React.ReactNode;

  last?: boolean;

  alignStart?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[110px_minmax(0,1fr)] gap-4 px-4 py-3",
        !last &&
          "border-b border-slate-100",
      )}
    >
      <div
        className={cn(
          "flex gap-2 text-slate-400",
          alignStart
            ? "items-start pt-2"
            : "items-center",
        )}
      >
        {icon}

        <span className="text-[10px] font-black text-slate-500">
          {label}
        </span>
      </div>

      <div
        className={cn(
          "min-w-0",
          alignStart
            ? ""
            : "flex items-center",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   STATUS BUTTON
   ========================================================= */

function StatusButton({
  active,
  label,
  onClick,
}: {
  active: boolean;

  label: string;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-lg border px-3 text-[10px] font-black transition",
        active
          ? "border-[#BFCBFF] bg-[#EEF3FF] text-[#5873F9]"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50",
      )}
    >
      {label}
    </button>
  );
}