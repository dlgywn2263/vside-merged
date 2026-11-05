// 경로: src/config/demoInputConfig.ts
//
// 졸업작품 발표용 자동 입력 설정. 문구·입력 방식·속도는 이 파일(코드는 demoCodeSnippets.ts)만
// 고치면 된다. 여기 등록되지 않은 입력창은 시연 모드에서도 자동 입력하지 않는다.
//
// 기능을 쓰려면 환경변수 세 개가 필요하다(NEXT_PUBLIC_ 은 빌드 때 박히므로 바꾸면 재배포).
//   NEXT_PUBLIC_DEMO_INPUT_ENABLED=true        없으면 기능 전체가 꺼진다
//   NEXT_PUBLIC_DEMO_PRESENTER_USER_ID=<회원번호>  시연자
//   NEXT_PUBLIC_DEMO_ASSISTANT_USER_ID=<회원번호>  보조 시연자
// 로컬 DB 와 배포 DB 의 회원번호가 달라서 코드가 아니라 환경변수로 둔다.

import { NAME_FIELD_CODE, SEARCH_BUTTON_FIELD_CODE } from "./demoCodeSnippets";

export type DemoRole = "presenter" | "assistant";

/** typing: 한 글자씩 / paste: (기존 내용이 있으면 전체 선택 → 삭제 뒤) 한 번에 입력 */
export type DemoInputMode = "typing" | "paste";

/** 입력창에 이미 내용이 있을 때. skip: 건드리지 않는다 / replace: 지우고 넣는다 / append: 뒤에 잇는다 */
export type DemoExistingPolicy = "skip" | "replace" | "append";

/** 공통 문구, 또는 계정별 문구. 그 계정의 문구가 없으면 자동 입력하지 않는다. */
export type DemoText = string | Partial<Record<DemoRole, string>>;

type DemoTargetBase = {
  /** false 면 이 대상만 끈다. 기본 true */
  enabled?: boolean;
  mode: DemoInputMode;
  text: DemoText;
  /** 타이핑 간격(ms). 없으면 DEMO_DEFAULTS */
  typingIntervalMs?: number;
  /** 한 번에 넣을 글자 수. 없으면 DEMO_DEFAULTS */
  charsPerTick?: number;
  /** true 면 입력한 뒤에도 칸이 비어 있을 때 다시 입력한다. 내용이 있으면 덮어쓰지 않는다. 기본 false */
  rerun?: boolean;
};

export type DemoTargetConfig = DemoTargetBase & {
  /** 기본 skip */
  existing?: DemoExistingPolicy;
  /** 이 대상을 자동 입력할 계정. 없으면 DEMO_INPUT_ROLES */
  roles?: readonly DemoRole[];
};

/**
 * 코드 에디터는 파일 이름으로 대상을 고른다.
 *
 * insert: 클릭한 커서 자리에 넣는다. 기존 코드와 팀원의 편집을 건드리지 않아 기본값이다.
 * skip:   파일이 비어 있을 때만 넣는다.
 * replace: 파일 전체를 바꾼다. 같은 방에 다른 사람이 있으면 실행하지 않는다
 *          (그 사람이 치던 내용이 함께 지워진다).
 */
export type DemoEditorExistingPolicy = "insert" | "skip" | "replace";

export type DemoEditorTargetConfig = DemoTargetBase & {
  id: string;
  /** 파일 이름(경로 제외). 예: SearchFrame.java */
  fileName: string;
  /** 브랜치 폴더 기준 전체 경로. 보조 시연자는 이 경로와 아래 값이 모두 맞아야 입력한다. */
  filePath?: string;
  /**
   * 보조 시연자는 파일을 직접 만들지 않아 코드맵 생성 기록이 없다. 대신 이 이름의 팀 워크스페이스,
   * 이 이름의 작업폴더·브랜치이고, 그 브랜치의 파일 트리에 filePath 가 실제로 있을 때만 입력한다.
   * 워크스페이스는 내 워크스페이스 목록(서버)에 있는 팀 워크스페이스여야 한다.
   */
  workspaceName?: string;
  projectName?: string;
  branchName?: string;
  /** true 면 보조 시연자가 Ctrl+F8 로 타이핑을 멈추고 이어 갈 수 있다 */
  pausable?: boolean;
  /** class-field: 클래스 본문의 비어 있는 줄에서만 입력한다 */
  placement?: "class-field";
  /** 코드(주석·문자열 제외)에 이것이 있으면 이미 입력된 것으로 보고 입력하지 않는다 */
  skipIfPresent?: RegExp;
  existing?: DemoEditorExistingPolicy;
};

export const DEMO_DEFAULTS = {
  typingIntervalMs: 45,
  charsPerTick: 1,
  /** 전체 선택이 눈에 보이도록 기다리는 시간 */
  selectDelayMs: 450,
  /** 지운 뒤 빈 칸이 눈에 보이도록 기다리는 시간 */
  clearDelayMs: 200,
  /**
   * 에디터는 틱마다 Yjs 업데이트와 커서 알림이 소켓으로 나간다. 사람이 빠르게 치는 수준의
   * 전송 횟수(초당 25번)를 넘지 않게 간격을 두고, 대신 한 번에 몇 글자씩 넣어 속도를 낸다.
   * 초당 75자라 1500자 코드가 약 20초 걸린다. 정확히 한 글자씩 보이려면 editorCharsPerTick 을
   * 1 로 둔다(같은 코드가 약 60초). 간격을 줄이는 것보다 이쪽이 협업 부하에 안전하다.
   */
  editorTypingIntervalMs: 40,
  editorCharsPerTick: 3,
  /** 팀원이 내 줄을 잡아 읽기 전용이 되면 이만큼 기다렸다가 멈춘다 */
  editorBlockedTimeoutMs: 15000,
} as const;

/**
 * 일반 입력창. 키는 화면별로 고유하게 짓는다(이름이 같은 입력창이 달라도 섞이지 않도록).
 * 새 입력창을 추가하려면 여기 등록하고 그 입력창에 useDemoAutoInput 을 연결한다.
 *
 * 문구를 바꿔도 인증·저장·전송 로직에는 영향이 없다. 작업폴더와 API 테스터 문구는 샘플이다.
 */
export const DEMO_INPUT_TARGETS = {
  // 프로젝트 생성(/new/workspace). 작업폴더 생성과 다른 화면이다.
  "project.create.name": {
    mode: "typing",
    text: "병원예약관리",
  },
  "project.create.description": {
    mode: "typing",
    text: "병원예약",
  },

  // 팀 채팅. 보조 시연자가 먼저 보내고 시연자가 답한다. 전송은 각자 Enter 나 전송 버튼으로 직접 한다.
  "ide.teamChat.message": {
    mode: "typing",
    roles: ["presenter", "assistant"],
    text: {
      assistant: "지금까지 구현한 기능 확인 부탁드립니다.",
      presenter: "네, 알겠습니다.",
    },
  },

  // 작업폴더 생성(CreateProjectModal)
  "aivs.createFolder.name": {
    mode: "typing",
    // 보조 시연자 에디터 대상(SEARCH_FRAME_PROJECT)도 이 이름을 쓴다. 실제 시연 작업폴더와 같아야 한다.
    text: "hospital-reservation-demo",
  },
  "aivs.createFolder.description": {
    mode: "typing",
    text: "병원 예약을 날짜별로 조회하는 Java Swing 관리 프로그램",
  },

  // 코드맵의 새 컴포넌트 경로. 모달을 열면 기본 경로가 이미 차 있어 지우고 입력한다.
  "codemap.createComponent.path": {
    mode: "paste",
    existing: "replace",
    text: "src/main/java/com/hospital/reservation/gui",
  },
  // 코드맵의 새 컴포넌트 이름. 영문·숫자·밑줄만 넣을 수 있는 칸이다.
  "codemap.createComponent.name": {
    mode: "typing",
    text: "SearchFrame",
  },

  // 샌드박스 Ctrl+K AI 요청. 샌드박스가 켜져 있을 때만 동작한다.
  "ide.aiPrompt.sandbox": {
    mode: "paste",
    existing: "replace",
    rerun: true,
    text: "기존 Java Swing 예약 조회 화면은 유지하고, 예약 날짜, 시간, 진료과목, 담당의, 예약 상태를 표시하는 결과 테이블을 추가해줘.",
  },

  // Git 브랜치와 커밋
  "git.createBranch.name": {
    mode: "typing",
    text: "feature/gui",
  },
  "git.commit.message": {
    mode: "typing",
    rerun: true,
    text: "예약 조회 GUI 구현",
  },

  // API 테스터. 최종 발표 대상과 별개로 유지한다. 쓰지 않으면 enabled 를 false 로 둔다.
  // 경로는 실제 예약 API 로 바꿔야 한다.
  "apiTester.url": {
    enabled: false,
    mode: "paste",
    existing: "replace",
    text: "{{baseUrl}}/api/reservations?date=2026-11-03",
  },

  // 개발일지. 긴 본문을 타이핑하지 않도록 제목과 본문 모두 일괄 입력한다.
  "devlog.create.title": {
    mode: "paste",
    existing: "replace",
    rerun: true,
    text: "예약 조회 GUI 구현 및 협업 기능 테스트",
  },
  "devlog.create.content": {
    mode: "paste",
    existing: "replace",
    rerun: true,
    text: `1. 개발 목표
사용자가 예약 내역을 쉽고 편리하게 확인할 수 있도록 예약 조회 GUI를 구현하고, 팀원들과의 협업을 통해 기능이 정상적으로 작동하는지 테스트하는 것을 목표로 하였다.

2. 개발 내용
예약 정보를 확인할 수 있는 GUI 화면 구성
예약 날짜, 시간, 예약자 정보, 예약 상태 등을 표시하는 기능 구현
사용자가 예약 내역을 쉽게 확인할 수 있도록 화면 배치 및 디자인 개선
예약 데이터가 GUI에 정상적으로 출력되는지 확인
팀원들과 개발 진행 상황 및 기능 구현 내용 공유
각 기능을 통합하여 정상적으로 동작하는지 테스트

3. 테스트 및 문제 해결
예약 조회 화면에서 데이터가 올바르게 표시되는지 확인하고, 예약 정보가 없을 경우와 여러 개의 예약이 존재하는 경우를 테스트하였다. 또한 팀원들이 구현한 기능과 연결하는 과정에서 발생할 수 있는 데이터 전달 및 화면 출력 문제를 점검하였다.
테스트 과정에서 발견된 오류나 개선 사항은 팀원들과 공유하고 수정 방향을 논의하였다.

4. 개발 결과
예약 조회 GUI의 기본적인 화면 구성과 예약 정보 출력 기능을 구현하였다. 팀원들과 협업하여 기능 간 연동 상태를 점검하고, 테스트를 통해 프로그램의 안정성과 사용 편의성을 개선할 수 있었다.`,
  },
} satisfies Record<string, DemoTargetConfig>;

export type DemoTargetId = keyof typeof DEMO_INPUT_TARGETS;

/**
 * 일반 입력창(DEMO_INPUT_TARGETS)을 자동 입력하는 계정. 보조 시연자는 코드 에디터만 쓴다.
 * 그래서 DEMO_INPUT_TARGETS 에 보조 시연자 문구를 적어도 입력되지 않는다(대상에 roles 를 적은 팀 채팅 제외).
 */
export const DEMO_INPUT_ROLES: readonly DemoRole[] = ["presenter"];

// 시연자가 코드맵으로 만들고 보조 시연자는 따로 여는 파일. 경로는 codemap.createComponent.path/name,
// 작업폴더 이름은 작업폴더 생성 자동 입력 문구와 같아야 한다.
// 워크스페이스는 발표에서 IDE 시연에 쓰는 팀 워크스페이스의 이름이다. 시연 중에 새로 만드는
// 워크스페이스(project.create.name, "병원예약관리")와는 다른 워크스페이스라 그 문구를 쓰지 않는다.
const SEARCH_FRAME_WORKSPACE = "병원 예약 관리 시스템";
const SEARCH_FRAME_BRANCH = "feature/gui";
const SEARCH_FRAME_PROJECT = DEMO_INPUT_TARGETS["aivs.createFolder.name"].text;
const SEARCH_FRAME_PATH = "src/main/java/com/hospital/reservation/gui/SearchFrame.java";

/**
 * 코드 에디터. 문구는 계정별로 둔다(여기 없는 계정은 입력되지 않는다). 한 파일에 계정마다
 * 대상을 따로 두어 서로의 코드가 들어가지 않게 하고, 중복 검사도 대상마다 한다.
 * 시연자는 자기 코드맵 기록이 있는 파일에, 보조 시연자는 workspaceName·projectName·branchName·filePath 가 모두 맞는 파일에만 입력한다.
 */
export const DEMO_EDITOR_TARGETS: DemoEditorTargetConfig[] = [
  {
    id: "ide.searchFrame.nameField",
    fileName: "SearchFrame.java",
    filePath: SEARCH_FRAME_PATH,
    mode: "typing",
    charsPerTick: 1,
    typingIntervalMs: 45,
    placement: "class-field",
    skipIfPresent: /\bnameField\b\s*(=|;)/,
    text: { presenter: NAME_FIELD_CODE },
  },
  {
    id: "ide.searchFrame.searchButton",
    fileName: "SearchFrame.java",
    filePath: SEARCH_FRAME_PATH,
    workspaceName: SEARCH_FRAME_WORKSPACE,
    projectName: SEARCH_FRAME_PROJECT,
    branchName: SEARCH_FRAME_BRANCH,
    pausable: true,
    mode: "typing",
    charsPerTick: 1,
    typingIntervalMs: 45,
    placement: "class-field",
    // 두 선언 중 하나라도 이미 있으면 다시 넣지 않는다.
    skipIfPresent: /\b(searchButton|buttonPanel)\b\s*(=|;)/,
    text: { assistant: SEARCH_BUTTON_FIELD_CODE },
  },
];

const parseUserId = (value: string | undefined) => (value ?? "").trim();

/** 배포 전에 기능 전체를 끄는 스위치. 값이 "true" 일 때만 켜진다. */
export const isDemoInputFeatureEnabled =
  process.env.NEXT_PUBLIC_DEMO_INPUT_ENABLED === "true";

const PRESENTER_USER_ID = parseUserId(process.env.NEXT_PUBLIC_DEMO_PRESENTER_USER_ID);
const ASSISTANT_USER_ID = parseUserId(process.env.NEXT_PUBLIC_DEMO_ASSISTANT_USER_ID);

/** 발표 계정이면 역할을, 아니면 null 을 돌려준다. 화면 기능을 켜는 조건일 뿐 권한 검사가 아니다. */
export function resolveDemoRole(userKey: string | null): DemoRole | null {
  if (!isDemoInputFeatureEnabled || !userKey) return null;
  if (userKey === PRESENTER_USER_ID) return "presenter";
  if (userKey === ASSISTANT_USER_ID) return "assistant";
  return null;
}

/** 이 계정에 입력할 문구. 없으면 null(자동 입력하지 않는다). */
export function resolveDemoText(
  target: Pick<DemoTargetBase, "text" | "enabled">,
  role: DemoRole,
): string | null {
  if (target.enabled === false) return null;
  const text = typeof target.text === "string" ? target.text : target.text[role];
  return text || null;
}

/** 지금 열린 파일의 이름에 해당하는, 이 계정의 문구가 있는 에디터 대상. 경로까지 맞는지는 호출하는 쪽에서 본다. */
export function findDemoEditorTarget(filePath: string, role: DemoRole): DemoEditorTargetConfig | null {
  const fileName = filePath.split(/[\\/]/).pop();
  return (
    DEMO_EDITOR_TARGETS.find(
      (target) => target.fileName === fileName && resolveDemoText(target, role) !== null,
    ) ?? null
  );
}
