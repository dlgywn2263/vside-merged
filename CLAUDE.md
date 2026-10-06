# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 이 문서의 목적

vside(WAIVS): 브라우저에서 팀이 함께 쓰는 웹 IDE. 졸업작품이다. 이 문서는 **IDE 의 Git 기능과 샌드박스 기능의 사용 목적을 분명히 하고, 그것을 확장·재설계하기 위한** 안내서다. 그 밖의 영역(설계 모듈, 일정, 커뮤니티, 관리자 등)은 일부러 다루지 않는다.

Git 과 샌드박스는 **팀 에디터(코드 동시편집) 위에서 돈다.** 브랜치가 협업 방 이름에 들어가고, Git 이 읽는 디스크 파일은 협업 세션이 저장해 준 사본이기 때문이다. 그래서 뒤쪽 "팀 에디터 — Git 을 고칠 때 깨면 안 되는 것" 절은 Git 작업과 맞닿는 부분만 추렸다. 그 절의 규칙을 깨면 Git 기능이 멀쩡해 보여도 팀원의 코드가 사라진다.

이 저장소는 **프론트엔드만** 담당한다. 백엔드는 `C:\Users\user\Desktop\IDE-bakend`(Spring Boot, 기본 `localhost:8080`, 실제 Gradle 프로젝트는 `demo/`)에 있다. `app/` 아래에 `route.ts` 같은 API 라우트를 만들지 말 것. **백엔드 코드를 읽어야 하면 먼저 사용자에게 이유를 말하고 허락을 받는다.**

`README.md` 는 create-next-app 기본값이라 읽을 내용이 없다. `.cursor/`, `.cursorrules`, `.github/` 는 존재하지 않는다.

---

## 명령어

```bash
npm run dev        # 개발 서버 (0.0.0.0:3000 - LAN 시연용 외부 바인딩)
npm run build
npm run lint       # eslint (flat config). 인자 없이 그대로 쓴다
npx eslint src/components/ide/git/GitBranchControls.jsx   # 파일 하나만 검사
npx tsc --noEmit   # 타입 검사 - package.json 에 스크립트가 없다
```

**테스트 프레임워크가 없다**(jest/vitest/playwright 모두 미설치, 테스트 파일 0건). 검증은 `npx tsc --noEmit` + `npm run lint` + 실제 화면 확인이다.

**Git·샌드박스·협업은 브라우저 창 두 개(가능하면 다른 계정)로만 검증된다.** 한 사람이 샌드박스에서 반영하는 동안 다른 사람이 대상 브랜치의 같은 파일을 열어 두고 있어야 아래 "Git 과 팀 에디터가 만나는 곳"의 문제가 드러난다. 한 창으로 확인한 결과를 "동작한다"고 보고하지 말 것.

협업 코드를 고쳤으면 Fast Refresh 를 믿지 말고 `npm run dev` 를 재시작하고 양쪽 창을 하드 새로고침한다(웹소켓·Y.Doc 이 어중간하게 되살아난다). 백엔드를 고쳤으면 그쪽도 재시작한다.

`.env.example` → `.env.local`. Git 작업에 필요한 키는 `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_WS_BASE_URL`(백엔드 주소)와 `NEXT_PUBLIC_GITHUB_CLIENT_ID`(Push/Pull/Fetch 전 OAuth)다. 전부 `NEXT_PUBLIC_*` 라 빌드 시점에 번들에 박히고, **접속자의 브라우저가 해석한다** — `localhost` 로 두면 다른 PC 에서 접속하는 순간 실패한다.

---

# 용어 — 먼저 읽을 것

**프론트 용어가 정본이다.** 판단 기준은 화면 문구가 아니라 **코드 식별자**이며, 코드 식별자는 프론트와 백엔드가 글자까지 같다. 화면 문구는 같은 대상을 다르게 부른다.

| 정본 용어 | 프론트 코드 | 백엔드 | 화면 문구 |
| --- | --- | --- | --- |
| 워크스페이스 | `workspaceId` | `Workspace` 엔티티(uuid). `path` 컬럼이 실제 폴더, `type` 이 `TEAM`/`PERSONAL` | **"프로젝트"**(대시보드·마법사 1단계) |
| 프로젝트 | `activeProject` / `projectName` | `Project` 엔티티. `name` 이 곧 폴더명 | "새 프로젝트 구성"(마법사), **"작업 폴더"**(IDE) |
| 브랜치 | `activeBranch` / `branchName`(기본 `master`) | DB 에 없다. git worktree 폴더로만 존재 | 브랜치 |
| 샌드박스 | `state.sandbox.enabled` (`sandboxSlice`) | 브랜치가 아니다. `{safe-run-root}/…/sandbox/{userId}/` 의 개인 레이어 | 샌드박스 |
| 파일 경로 | `node.id` / `filePath` | `path` 쿼리 파라미터 | — |

- IDE 의 "새 작업폴더"(`CreateProjectModal.jsx`)가 프로젝트를 만들고, 탐색기 우클릭 "시작 프로젝트로 설정"(`Sidebar.jsx` `handleSetStartup`)이 `activeProject` 를 바꾼다.

서버 디스크는 네 층이다. **`.git` 은 프로젝트마다 하나이고, 프로젝트 폴더 아래 `master/` 안에 있다.** 나머지 브랜치 폴더는 그 저장소를 공유하는 git worktree 다.

```
C:\WebIDE\users\{userId}\{워크스페이스}\{프로젝트}\{브랜치폴더}\{파일경로}
   └ 사용자 개인 폴더        └ Workspace.path   └ git 단위   └ worktree
     (화면에는 C:\ 로 보인다)                                (.git 은 master\ 안)
```

- **파일 경로에 프로젝트 이름이 들어가지 않는다.** 브랜치 폴더 기준 상대경로이고, 워크스페이스·프로젝트·브랜치는 따로 나른다(`fetchFileContentApi(workspaceId, projectName, branchName, path)`). 예외는 코드맵 가상 트리의 `node.realPath`(`{프로젝트}/{나머지}`) 하나다.
- **브랜치 이름 ≠ 폴더 이름.** 백엔드가 슬래시를 URL 인코딩해 `feature/login` 의 폴더는 `feature%2Flogin` 이다.
- 프론트가 주고받는 경로는 전부 가상 경로(`C:\` = 사용자 개인 폴더)다. **번역과 검증은 백엔드에서만 한다.** 단 DB `Workspace.path` 에는 진짜 경로가 들어간다(git·Docker 가 그 값으로 파일을 찾는다).

---

## 코드 지도 — Git·샌드박스와 그 아래층

```
src/store/slices/fileSystemSlice.js   workspaceId · activeProject · activeBranch · 열린 파일 (상태 전부)
src/hooks/ide/useGitBranches.js       브랜치·샌드박스 로직의 중심 훅 (전환·생성·삭제·병합·샌드박스)
src/hooks/ide/useGitRemoteActions.js  MenuBar 의 Pull/Push/Fetch
src/components/ide/
  git/GitBranchControls.jsx   상단 바: 브랜치 드롭다운·생성/병합 모달·샌드박스 버튼 (1597줄)
  GitDashboard.jsx            좌측 "Git" 활동: Status/History/충돌/원격 (3109줄, useGitBranches 안 씀)
  Sidebar.jsx                 파일 트리 + /ws/workspace-events (트리·브랜치 목록 동기화)
  TeamIdeMain.jsx / IdeMain.jsx   팀/개인 셸. 서로 복붙 중복이 많다
  CodeEditor.jsx              에디터 + 협업 바인딩 + 병합 충돌 UI (2745줄)
  CreateProjectModal.jsx      "새 작업폴더" = 프로젝트 생성
src/lib/ide/api.js            워크스페이스·프로젝트·파일·Git·샌드박스 REST (1644줄)
src/lib/ide/collab/           코드 동시편집 세션 (codeDocSession.ts / codeDocApi.ts)
src/lib/api/apiClient.js      모든 REST 의 공통 통로 (토큰 갱신이 여기 붙어 있다)
```

Next.js 16 App Router + React 19. IDE 라우트는 `app/(ide)/ide/{personal,team}/[id]`(`[id]` = 워크스페이스 id, 컴포넌트가 `useParams()` 로 읽음)이고 둘 다 `ssr: false` 껍데기다. **팀 모드는 URL 로만 판별한다**(`pathname?.includes("/team")`).

---

# 프로젝트 구조 · Git · 샌드박스

백엔드 동작은 직접 읽지 않았으므로 서버 쪽 사실은 "(백엔드 확인 필요)"로 표시했다.

## 1. 사용 목적 — 이 기능들이 사용자에게 해 주는 것

재설계할 때 이 목적을 기준으로 판단한다.

| 사용자 | 하고 싶은 것 | 지금 제공하는 방법 |
| --- | --- | --- |
| 누구나 | 한 워크스페이스 안에 여러 프로그램(프로젝트)을 두고 골라서 작업 | 탐색기 최상위가 프로젝트 목록. "시작 프로젝트"를 고르면 실행·Git·브랜치가 그 프로젝트 기준이 된다 |
| 누구나 | 템플릿으로 바로 돌아가는 프로젝트 만들기, GitHub 저장소 연결 | `CreateProjectModal` — `SPRING_BOOT`/`REACT`/`NEXT`/`VANILLA`/`CONSOLE`(JAVA·PYTHON·CPP) + 선택적 `gitUrl` |
| 누구나 | Sourcetree 처럼 화면으로 Git 쓰기 | `GitDashboard`(스테이징·커밋·히스토리 그래프·리셋·커밋 체크아웃·병합·충돌 해결·Push/Pull) + 상단 `GitBranchControls` |
| 팀 | 같은 브랜치에서 여럿이 실시간으로 같은 파일 고치기 | 팀 에디터(Yjs). 브랜치가 같으면 같은 방 |
| 팀 | **남에게 영향 주지 않고 혼자 실험한 뒤, 끝나면 한 번에 합치기** | 샌드박스(개인 레이어). 브랜치는 그대로 두고 켜면 내가 고친 파일만 팀원에게 안 보인다. "반영"으로 파일마다 3-way 병합 |
| 팀 | 합치다 충돌이 나면 화면에서 고르기 | (브랜치 병합) `GitDashboard` 충돌 목록 → 에디터의 "내 것 / 상대 것 / 둘 다". (샌드박스 반영) 그 자리에서 같은 화면으로 고르고 "샌드박스 충돌 해결 완료" |

**브랜치는 사람마다 따로 고른다.** `activeBranch` 는 서버 상태가 아니라 각 브라우저의 Redux 값이다. 같은 워크스페이스에서 A 는 `develop`, B 는 자기 샌드박스를 보고 있을 수 있고, 협업 방이 브랜치별로 갈리므로 서로의 편집을 보지 않는다. **샌드박스의 격리는 별도 서버 기능이 아니라 "브랜치 = worktree 폴더 = 협업 방" 구조에서 나온다.**

## 2. 상태 모델

| 필드 | 의미 | 주의 |
| --- | --- | --- |
| `workspaceId` | URL `[id]` | IDE 진입 시 `setWorkspaceId` |
| `tree` / `projectList` | `fetchWorkspaceProjectsApi` 결과. `tree.children` 이 프로젝트 노드 | 프로젝트 노드의 `children` 은 펼칠 때 `mergeProjectFiles` 로 채운다 |
| `activeProject` | "시작 프로젝트" | 초기값 `null` |
| `activeBranch` | 보고 있는 브랜치 | 초기값 `"master"`. 프로젝트마다 따로 기억하지 않는다 |
| `openFiles` / `fileContents` / `activeFileId` | 열린 탭과 내용 | **키가 파일 경로뿐이다** (프로젝트·브랜치가 키에 없다) |

마지막 줄이 이 영역의 가장 중요한 제약이다. **프로젝트나 브랜치를 바꿀 때 열린 파일을 전부 닫아야 한다**(`closeAllFiles`). 안 닫으면 `develop` 의 `Main.java` 내용이 샌드박스의 `Main.java` 로 저장된다(`GitBranchControls.executeCreateSandbox` 주석이 이 사고를 설명한다). 여러 브랜치·프로젝트의 파일을 동시에 탭으로 띄우려면 키 구조부터 바꿔야 한다.

**`activeProject` 를 세팅하는 곳** — 브랜치를 같이 다루는지가 제각각이다.

| 위치 | 하는 일 | `activeBranch` | `closeAllFiles` |
| --- | --- | --- | --- |
| `useWorkspaceEntry.ts` (개인·팀 진입 공통, `IdeMain`/`TeamIdeMain` 이 호출) | 들어오자마자 `activeProject=null`·`activeBranch=master` 로 비운 뒤, localStorage `lastProject_{id}` 복원(없으면 첫 프로젝트). 브랜치는 복원한 프로젝트에 `lastBranch_{id}` 가 실제로 있을 때만 쓰고 아니면 `master` | 세팅 | 진입 시 |
| `Sidebar.jsx` `handleSetStartup` / 루트에 폴더 생성 | 시작 프로젝트 지정 | **그대로 둔다** | 안 함 |
| `CreateProjectModal.jsx:537` | 새 프로젝트를 시작 프로젝트로 | 그대로 | 안 함 |
| `GitDashboard.jsx` `handleProjectChange` | 대시보드 상단 프로젝트 선택 | `master` 로 | 안 함 |

그 결과(재설계 시 정리 대상):

- 워크스페이스 진입은 `useWorkspaceEntry` 가 시작 프로젝트·브랜치를 자동으로 정한다(예전에는 팀 모드가 세팅하지 않아 "No Project" 였고, 이전 워크스페이스의 브랜치가 남아 탐색기가 안 열렸다). 프로젝트가 하나도 없는 워크스페이스에서만 `activeProject` 가 `null` 이다.
- 프로젝트를 바꿔도 브랜치가 따라 바뀌지 않는다. A 의 `feature/x` 를 보다 B 로 바꾸면 B 의 `feature/x` 를 찾고(없으면 트리 로드 실패), 열린 파일도 닫히지 않는다.
- `Sidebar` 는 활성 프로젝트가 아닌 프로젝트를 펼치거나 그 파일을 열 때 **항상 `master`** 로 읽는다(`getBranchForProject`, `handleFileClick`). 브랜치는 사실상 "활성 프로젝트 전용" 개념이다.

## 3. 컨텍스트 전환 — 브랜치를 바꾸는 여러 길

올바른 절차는 네 단계다: **열린 파일 닫기 → 코드맵 가상 트리 비우기 → `setActiveBranch` → 새 브랜치 트리 받기.** 이것이 한 함수로 모여 있지 않고 곳곳에서 조금씩 다르게 되풀이된다.

| 경로 | 닫기/비우기 | 트리 다시 받기 | `branch-context-changed` |
| --- | --- | --- | --- |
| `useGitBranches.switchBranch` (`:418-471`) | O | O (실패 시 이전 브랜치로 롤백) | X |
| `GitBranchControls.resetEditorForBranchChange` (`:486-503`) | O | X | O |
| `GitDashboard.handleBranchChange` / `moveToConflictStatusView` | O | X | X |
| `TeamIdeMain` `activeBranch` effect (`:334-360`) | O | X | O |
| `useGitBranches.mergeBranches` 끝부분 | O | O | X |

실제로 트리가 갱신되는 것은 대부분 `Sidebar.jsx:487-491` 의 `useEffect([activeBranch, ...]) → handleExpandProject` 덕분이다. 팀 모드에서는 `TeamIdeMain` effect 가 닫기와 이벤트를 한 번 더 보내 중복 실행되고, 개인 모드에는 그 effect 가 없다. **새 전환 경로는 `useGitBranches.switchBranch` 를 쓰고 직접 `setActiveBranch` 를 부르지 말 것.** 재설계한다면 이 네 단계를 한 곳(훅 또는 thunk)으로 모으는 것이 첫 작업이다.

브랜치가 바뀌면 `Terminal.jsx`(`/ws/terminal`)도 다시 붙는다. `waivs:branch-context-changed` 를 실제로 듣는 곳은 `CodeMap.jsx:370-380` 뿐이다.

## 4. Git 기능 지도

**화면 진입점은 세 곳이다.**

1. **상단 바 `GitBranchControls`** — `MenuBar.jsx:911` 이 개인·팀 모두 렌더. 브랜치 드롭다운(전환·삭제·병합), 생성 모달, 병합 모달, 팀 전용 "샌드박스"·"병합" 버튼. 로직은 전부 `useGitBranches`.
2. **좌측 "Git" 활동 `GitDashboard`** — `activeActivity === "git"` 일 때만 **마운트된다.** Status 뷰(스테이징·커밋·충돌 목록·병합 취소·변경 폐기), History 뷰(그래프, 커밋 우클릭 → 체크아웃·병합·리셋, 브랜치 우클릭 → 삭제·병합), GitHub OAuth 팝업과 원격 URL 연결. **`useGitBranches` 를 쓰지 않고 API 를 직접 부르며 브랜치 목록도 따로 들고 있다.**
3. **`MenuBar` 의 Pull/Push** — `useGitRemoteActions`. 결과는 터미널 패널에 `[Git] ...` 로 찍는다. `GITHUB_TOKEN` 이 든 403 이면 `code: "GITHUB_AUTH_REQUIRED"` 로 바꿔 마이페이지 연동을 안내한다. **이 403 은 로그인 만료가 아니다** — 로그아웃 처리(`apiClient.js` 의 401/403 → `clearAuth`)와 섞지 말 것.

**REST 계약** (`src/lib/ide/api.js`, BASE `/api/git`. 파일·프로젝트는 `/api/workspaces`)

| 함수 | 메서드·경로 | 비고 |
| --- | --- | --- |
| `fetchBranchListApi` | GET `/api/git/{ws}/{project}/branches` | 문자열 또는 객체 배열 — `normalizeBranchValue` 가 흡수 |
| `createBranchApi` | POST `/api/git/branches` | `{branchName, baseBranch, checkoutAfterCreate}` |
| `deleteBranchApi` | DELETE `/api/git/branches` | 워크트리도 함께 제거(확인창 문구 기준) |
| `mergeBranchesApi` | POST `/api/git/branches/merge` | `{sourceBranch, targetBranch, mergeMode: "NO_FF", deleteSourceAfterMerge}` |
| `fetchGitStatusApi` | GET `.../status?branchName=` | `{staged, unstaged, conflicted, isMerging}` |
| `stageFilesApi` / `unstageFilesApi` | POST `/stage` · `/unstage` | `filePattern` (`"."` 로 전체) |
| `commitChangesApi` | POST `/commit` | `authorName/Email` 인자가 있지만 호출처는 안 넘긴다(백엔드 확인 필요) |
| `fetchGitHistoryApi` | GET `.../history` | **실패하면 빈 배열**을 돌려 에러가 안 보인다 |
| `resetCommitApi` / `checkoutCommitApi` / `mergeCommitApi` | POST `/reset` · `/checkout-commit` · `/merge/start` | 커밋 우클릭 메뉴 |
| `abortMergeApi` / `discardChangesApi` | POST `/merge/abort` · `/discard` | discard 는 `confirmText: "DISCARD"` 요구 |
| `fetchRemoteApi` / `pullFromRemoteApi` / `pushToRemoteApi` | POST `/fetch` · `/pull` · `/push` | 403 + `GITHUB_TOKEN` → OAuth 필요 |
| `updateGitUrlApi` | POST `/api/git/project/git-url` | 프로젝트에 원격 연결 |
| `createProjectApi` | POST `/api/workspaces/project` | `{projectName, language, templateType, gitUrl}` |
| `fetchWorkspaceProjectsApi` | GET `/api/workspaces/{ws}/projects` | 루트 노드. `children` 이 프로젝트 |
| `fetchProjectFilesApi` | GET `/api/workspaces/{ws}/files?projectName&branchName` | 브랜치 폴더 트리 |

새 Git API 는 `apiFetch` 를 거치고(`authFetch` 도 내부에서 탄다), **`throwApiResponseError` 로 status 를 실어 던져야** `isMergeConflictError` 가 409 를 알아본다. 오래된 Git 함수 일부는 아직 `new Error(text)` 라 status 가 없다.

브랜치 이름 검증(`validateBranchName`, `useGitBranches.js:158-231`)은 git ref 규칙을 거의 그대로 흉내 낸다. `master`/`main` 은 보호 브랜치라 만들 수도 지울 수도 없다. **`:` 를 막는 것은 협업 방 이름 구분자이기 때문이기도 하다**(아래 팀 에디터 절) — 풀지 말 것. 병합 기본 대상은 `develop` 이 있으면 `develop`, 없으면 `master`(`resolveDefaultMergeTarget`).

알림 UI 가 다르다: `GitBranchControls` 는 `alert()`, `GitDashboard` 는 자체 `showAlert`/`showConfirm` 다이얼로그. 브랜치 종류별 색은 `GitBranchControls.getBranchMeta`(main 회색·develop 파랑·feature 보라·release 호박·hotfix 장미·샌드박스 남색).

## 5. 안전 실행 · 샌드박스(개인 레이어)

서버 쪽 명세는 백엔드 저장소의 `docs/safe-run-sandbox.md` 가 정본이다(REST·이벤트·반영 절차). 여기서는 프론트를 고칠 때 깨면 안 되는 것만 적는다.

**샌드박스는 더 이상 브랜치가 아니다.** 예전에는 개인 브랜치(`focus-u{회원번호}-…`)를 만들어 전환했다. 지금은 같은 브랜치에 머문 채 **내가 고친 파일만** 서버가 따로 보관한다. 켜고 끄는 것은 깃발 하나다. 남아 있는 `focus-` 브랜치는 평범한 브랜치로 보인다.

```
src/lib/ide/safeRun.ts                 안전 실행: [SAFE_RUN_INFO] 줄 가려내기, 상태 조회
src/lib/ide/sandbox/sandboxApi.ts      샌드박스 REST (/api/sandbox/**)
src/lib/ide/sandbox/sandboxApply.ts    반영 — 서버 직접 반영 / 브라우저가 팀 문서에 넣기
src/lib/ide/sandbox/sandboxTree.ts     탐색기 트리에 내 샌드박스 덧씌우기
src/lib/ide/collab/roomName.ts         방 이름(팀 방 / sbx 개인 방). 백엔드 CollabRoomName 과 같아야 한다
src/store/slices/safeRunSlice.ts       작성자 상태, 마지막 실행 결과
src/store/slices/sandboxSlice.ts       켜짐 여부, 반영 안 된 파일 목록, 해결 중인 충돌
src/components/ide/SafeRunStatusBar.tsx        팀 화면 맨 아래 상태바
src/components/ide/sandbox/SandboxControls.tsx 상단 바: 샌드박스 켜기 / 반영 / 버리기 / 끄기
```

### 안전 실행

- RUN 메시지에 `token` · `safeRunInfo` 를 싣는다(`MenuBar.handleQuickRun`). **팀 모드에서만.** 서버는 "누가 고쳤는지"를 동시편집 소켓으로만 알기 때문에, 개인 모드에서 실으면 내 수정이 "출처 모르는 변경"으로 취급돼 컴파일이 깨졌을 때 내 수정이 빠진 옛 버전이 실행된다.
- `[SAFE_RUN_INFO]{json}` 메시지는 출력 창에 찍지 않고 `safeRunSlice.lastRun` 에 넣는다. 사람이 읽는 안내(`[System] ○○ 님이 수정 중인 변경…`)는 서버가 따로 보내므로 그대로 찍힌다.
- 실행 전 저장은 **활성 파일 하나만** 한다(`saveActiveFileBeforeRun`). 다른 탭의 Redux 사본을 저장하면 그 사이 팀원이 고친 내용을 덮는다.
- 상태바의 값은 `Sidebar` 의 `/ws/workspace-events` 핸들러가 `AUTHOR_STATUS_CHANGED` · `GREEN_UPDATED` 를 받아 넣는다. 알림은 바뀔 때만 오므로 상태바가 브랜치를 바꿀 때마다 `GET /api/safe-run/status` 로 다시 받는다.

### 샌드박스 — 파일 하나의 두 상태

`CodeEditor` 가 `sandboxSlice` 를 보고 파일마다 정한다(`isSandboxEditing` / `isSandboxViewOnly`).

| 상태 | 방 | 입력 | 저장 경로 | 표시 |
| --- | --- | --- | --- | --- |
| 아직 안 고친 파일 | 팀 방 | **읽기 전용** | (팀 방의 자동 저장 그대로) | "👥 팀 실시간 보기 중" + [샌드박스에서 고치기] |
| 내가 고친 파일 | `sbx:{userId}:…` 개인 방 | 가능 | **`PUT /api/sandbox/file`** | "📝 샌드박스에서 수정 중" |

- 전환(`enterSandboxEdit`): 팀 문서의 지금 내용(`yText.toString()`)을 `liveContent` 로 `POST /files/fork` → Redux 에 내용 넣기 → `addSandboxFile` → 협업 effect 가 개인 방으로 세션을 새로 만든다. **`liveContent` 를 디스크로 대신하면 안 된다**(디스크는 최대 30초 늦다).
- 버튼 없이 바로 입력하려 해도 `onDidAttemptReadOnlyEdit` 로 같은 전환을 한다. **눌렀던 글자는 다시 넣지 않는다.**
- 샌드박스 상태를 아직 모를 때(`isSandboxUnknown`)도 입력을 막는다. 켜져 있었다면 그 입력이 팀 방으로 간다.
- **`sbx` 방에서 팀 파일 저장(`saveFileApi`)을 부르면 팀 파일이 내 샌드박스 내용으로 덮인다.** 저장 경로는 세 군데서 갈린다 — 세션의 `saveFile` 콜백, `handleSaveCurrentFile`(Ctrl+S), `MenuBar.saveActiveFileBeforeRun`. 새 저장 경로를 만들면 여기도 갈라야 한다.
- 켜고 끌 때는 열린 탭을 전부 닫는다(`SandboxControls`). 탭 내용의 키가 파일 경로뿐이라, 팀 내용으로 열려 있던 탭이 개인 방에 붙으면 팀 내용이 샌드박스 파일을 덮는다.

### 고치는 동안 팀이 그 파일을 고쳤을 때

개인 방에서는 팀원의 편집이 보이지 않는다(없어지는 것은 아니다 — 반영 때 3-way 로 합쳐진다). 그래서 따로 알리고, 반영 전에 미리 합칠 수 있게 한다.

- 서버가 `SANDBOX_TEAM_FILE_CHANGED` 를 브랜치 방으로 보내면 `Sidebar` 가 받아, 내 목록에 있는 파일일 때만 `GET /state` 를 다시 부른다. `files[].teamChanged` 가 켜지면 `CodeEditor` 가 주황 띠 "👥 팀이 이 파일을 고쳤어요" + `[팀 변경 가져오기]` 를 띄운다.
- 가져오기(`handlePullTeamChanges`): 내 세션 `flush` → `readTeamLiveContent`(팀 방이 열려 있으면 팀 문서, 아니면 디스크) → `POST /pull` → 결과를 `applyMergedText` 로 **바뀐 부분만** 내 문서에 넣는다. 충돌이면 충돌 본문을 넣고 반영 때와 같은 화면으로 간다.
- **팀 → 나 한 방향이고, 자동으로 가져오지 않는다.** 자동으로 하면 팀원이 쓰다 만 코드가 내 샌드박스에 들어와 샌드박스의 의미가 없어진다.
- 가져온 직후 표시는 `markSandboxTeamSynced` 로 직접 내린다. 서버는 팀 파일을 디스크로 보는데 디스크가 몇 초 늦어, 바로 다시 물으면 잠깐 "아직 다르다"고 답한다.

### 반영 · 버리기 — 순서를 지켜야 한다

**저장을 끝까지 기다린다(`flushActiveEditorSession`) → 탭을 닫는다 → 서버에 요청한다.** 탭을 닫을 때 나가는 마지막 자동 저장은 기다려 주지 않아서, 순서가 바뀌면 그 늦은 저장이 방금 반영한(버린) 파일을 샌드박스에 다시 만든다.

반영은 파일마다 `/merge` 로 판정한 뒤 갈린다(`sandboxApply.applySandboxFile`).

- 팀 방이 닫힌 파일, 새 파일, 삭제 → `/apply-direct`(서버가 디스크에 쓴다). 409 `ROOM_OPEN` 이 오면 아래로.
- 팀 방이 열린 파일 → 화면에 안 띄우는 `CodeDocSession` 으로 팀 방에 들어가 **바뀐 부분만 한 트랜잭션으로** 넣는다(`applyMergedText`). 문서를 통째로 갈아 끼우면 팀원이 다른 줄에 치던 글자와 커서가 날아간다. 판정 뒤 적용 직전에 문서가 그대로인지 다시 보고, 그 사이에 `await` 를 두지 않는다.
- 충돌 → 충돌 본문을 내 샌드박스 파일에 넣고(`sandboxSlice.conflicts` 에 그때의 팀 내용을 기억) 기존 "내 것 / 상대 것 / 둘 다" 화면으로 고른다. 마칠 때 **`/resolve`** 를 부른다. 그냥 저장으로 대신하면 비교 기준이 옛 것이라 같은 자리에서 또 충돌한다.

### 탐색기

샌드박스가 켜져 있으면 `handleExpandProject` 가 받은 트리에 내 샌드박스를 덧씌운다(새 파일 추가, 지운 파일 숨김, 고친 파일 표시). 파일 만들기·지우기는 샌드박스로 가고, **이름 변경과 폴더 작업은 막는다**(백엔드 샌드박스가 지원하지 않고, 팀 폴더에 바로 적용되면 헷갈린다). `refreshOpenFileContents` 는 샌드박스 파일을 팀 내용으로 덮지 않는다.

### 알아 둘 것

- 디버그는 안전 실행·샌드박스의 대상이 아니다. 팀 파일 그대로 돈다.
- 충돌을 해결하다 새로고침하면 `conflicts` 가 사라진다. 반영을 다시 누르면 충돌 표시가 남은 파일을 찾아 팀 파일의 지금 내용을 기준으로 다시 "해결 중"으로 돌려놓는다.
- 상태바는 탐색기가 있는 편집 화면에서만 보인다. 알림을 받는 소켓이 `Sidebar` 에 있기 때문이다.
- 옛 샌드박스 코드는 제거됐다(`createSandboxApi` · `applySandboxApi` · `isSandboxBranch` 계열 · `BranchSelector.jsx` · `waivs:open-git-status` · `wevaisPendingSandboxCleanup`).

## 6. Git 과 팀 에디터가 만나는 곳 — 재설계 시 가장 먼저 볼 것

Git 은 **디스크**를 읽고 쓰고, 팀 에디터의 정본은 **서버 메모리의 Y.Doc** 이다. 둘을 잇는 것은 "저장 담당자가 3초 유휴/30초 상한으로 디스크에 쓰는 것" 하나뿐이다.

1. **Git 이 보는 디스크는 최대 30초 늦다.** `GitDashboard` 의 커밋·스테이징은 저장을 먼저 밀어내지(flush) 않아 방금 친 내용이 커밋에서 빠질 수 있다. 샌드박스 반영만 Redux 내용을 먼저 저장해 이 틈을 메운다. 세션의 `flush()` 를 밖에서 부르는 경로는 아직 없다.
2. **Git 이 디스크를 바꿔도 열려 있는 협업 방은 모른다.** Pull·병합·리셋·커밋 체크아웃·변경 폐기·샌드박스 반영이 대상 브랜치 파일을 바꾸면, 그 파일을 열어 둔 팀원의 Y.Doc 은 옛 내용 그대로다. `Sidebar` 가 `FILE_TREE_CHANGED` 로 열린 파일을 다시 읽어도(`refreshOpenFileContents`) 그 값은 **Redux 로만** 들어가고 팀 모드 에디터에는 가드 때문에 들어가지 않는다(의도된 동작 — 아래 규칙 ④). 그러다 누가 한 글자라도 치면 저장 담당자가 **옛 문서 전체를 디스크에 다시 써서 Git 결과를 덮는다.** 서버가 Git 작업 뒤 방을 비우는지는 백엔드 확인 필요. 메우려면 "Git 작업 → 영향받은 방 초기화(또는 강제 재시드) → 클라이언트 재접속" 같은 계약이 필요하다.
3. **충돌 해결 편집은 팀 모드에서 CRDT 를 탄다.** `applyConflictEdit`(`CodeEditor.jsx:274`)는 `executeEdits`, 선택 되돌리기(`handleConfirmResetConflictSelection`)는 `pushEditOperations` 로 모델을 직접 고치므로 같은 브랜치의 팀원에게 퍼진다. `GitDashboard.handleOpenConflictFile` 은 내용을 REST 로 받아 Redux 에 넣는데, 팀 모드 에디터는 협업 방 내용을 보여 주므로 둘이 다를 수 있다.
4. **브랜치 = 방.** 방 이름 `{ws}:{project}:{branch}:{file}` 에 브랜치가 들어가 브랜치를 바꾸면 자동으로 다른 방에 붙는다. 브랜치 이름 규칙이나 방 이름 규약을 바꾸면 백엔드 `security/CollabRoomName` 도 같이 바꿔야 한다.
5. **실행·디버그 전 저장과 "모두 저장"은 저장 담당자 선출을 거치지 않는다.** 실행·디버그는 화면 내용을 직접 읽어(`readActiveEditorContent`, `MenuBar.jsx:199`, `:277`) 쓰고, "모두 저장"은 Redux 전체를 쓴다(`:448-450`). 샌드박스 반영 전 저장도 화면 내용을 읽는 방식으로 맞추면 400ms 틈이 없어진다.

## 7. 파일 트리·브랜치 목록 동기화 — `Sidebar.jsx`

`/ws/workspace-events?room=workspace:{id}:project:{name}:branch:{branch}` 에 붙는다(`:659` 조립, `:755` 접속, `getWsBase()` 사용). 끊기면 지수 백오프(최대 30초, `:64`)로 재접속하고 성공하면 트리를 다시 받는다(`:769`).

- **`FILE_TREE_CHANGED`** (`:710-745`) — 워크스페이스·프로젝트·브랜치 **3중 일치** 확인 → `DELETE`/`RENAME` 이면 `closeFilesByPath` → 100ms 디바운스로 트리 재조회 + **열린 파일 내용 재조회**(`refreshOpenFileContents`, `:570-630`).
- **`BRANCH_CHANGED`** (`:690-708`) — 브랜치 생성·삭제 시. 방 이름에 브랜치가 있어 한 방에만 보내면 다른 브랜치를 보는 사람에게 닿지 않으므로, 백엔드가 같은 워크스페이스·프로젝트의 방 **전체**로 보낸다. `Sidebar` 가 `waivs:branch-list-changed` 로 넘기고 `useGitBranches.js:369-392` 가 목록을 다시 불러온다.
- 핸들러는 `eventHandlersRef` 로 우회한다(`:446`, `:636-642`). 이 구조를 풀면 이벤트마다 재연결이 일어난다.

## 8. 브라우저 이벤트·저장소 키 — 이름이 비슷하니 섞지 말 것

| 이름 | 보내는 곳 | 듣는 곳 | 뜻 |
| --- | --- | --- | --- |
| `waivs:branch-context-changed` | `GitBranchControls:494`, `TeamIdeMain:350` | `CodeMap` 만 | 내가 보는 브랜치가 바뀌었다 |
| `waivs:branch-list-changed` | `Sidebar`(서버 `BRANCH_CHANGED` 중계) | `useGitBranches` | **남이** 브랜치를 만들거나 지웠다 |
| `waivs:branches-changed` | `GitBranchControls`, `GitDashboard` (`notifyBranchesChanged`) | 같은 두 파일 | **내가** 브랜치를 바꿨다 — 같은 탭의 두 UI 동기화. 상수를 두 파일이 각자 재선언(`GitBranchControls:141`, `GitDashboard:74`) |
| session/localStorage `wevaisGithubOAuth*`, `wevaisPendingGitRemoteAction` | `GitDashboard` | 같은 파일 | OAuth 팝업 왕복 중 하려던 Push/Pull |
| localStorage `lastProject_{id}` / `lastBranch_{id}` | `IdeMain` | `IdeMain` | 개인 모드 복원(팀 모드엔 없다) |

## 9. 중복·죽은 코드 (정리 후보)

- **브랜치 목록 정렬·정규화가 세 벌**: `useGitBranches.normalizeBranchList`, `GitBranchControls` 의 `normalBranches`, `GitDashboard.normalizeBranchListForMerge`. `DEFAULT_BRANCH = "master"` 도 두 곳.
- **브랜치 목록 상태가 두 벌**: `useGitBranches.branches` 와 `GitDashboard.branchList`, `waivs:branches-changed` 로만 맞춰진다. `GitBranchControls` 는 `branch-list-changed` 외에 `branches-changed` 도 들어 목록을 두 번 받는다.
- **import 0건**: `claimCollabSeedApi`(예전 시드 방식 흔적).
- `debugSocket.js:53` 만 브랜치 기본값이 `"main-repo"` 다(호출처가 항상 넘기므로 현재는 도달하지 않는다).

## 10. 재설계 전에 백엔드에서 확인할 질문

프론트만 보고 단정하면 틀린다(과거 "충돌 해결이 없다", "브랜치가 독립되지 않는다"고 잘못 진단한 적이 있다).

1. `/sandbox/apply` 성공 시 샌드박스 브랜치·worktree 를 서버가 지우는가? 충돌 시 대상 브랜치는 `isMerging` 상태로 남는가?
2. Git 작업(pull·merge·reset·checkout-commit·discard·sandbox apply) 뒤 서버가 해당 브랜치의 협업 방을 비우는가? `FILE_TREE_CHANGED` 는 이 작업들에도 나가는가?
3. 남의 샌드박스 삭제·병합을 서버가 막는가? (이름 형식 `focus-u{userId}-{task}` 는 서버가 정한다 — 확인됨.)
4. 커밋 작성자는 무엇으로 정해지는가(`authorName` 을 안 보내므로)?
5. 워크스페이스 `type`(TEAM/PERSONAL)과 URL(`/ide/team` vs `/ide/personal`)이 어긋나면 서버가 거부하는가? 지금 프론트는 URL 만 보고 팀 모드를 켠다.

---

# 팀 에디터 — Git 을 고칠 때 깨면 안 되는 것

에디터는 개인·팀 모드가 `CodeEditor.jsx` 하나를 공유한다. 여기서는 Git·샌드박스 작업과 맞닿는 부분만 적는다. 커서·이름표·줄 잠금·음성·채팅 같은 협업 UI 는 이 문서 범위 밖이다.

| 항목 | 개인 | 팀 |
| --- | --- | --- |
| 셸 | `IdeMain.jsx` | `TeamIdeMain.jsx` (리사이즈·`renderMainContent` 가 복붙 중복 — 한쪽을 고치면 다른 쪽도 본다) |
| 문서 정본 | Redux `fileContents` | Yjs `Y.Text("monaco")` (서버 메모리) |
| 디스크 저장 | 타이핑 디바운스(`scheduleDiskSave`) | 접속자 중 담당 1명이 자동 저장 |

## 1. 한 파일의 일생 (팀 모드)

**정본은 Y.Doc 하나뿐이고, Redux 와 디스크는 그로부터 파생되는 사본이다.**

```
[열기]   CodeDocSession.open()  (codeDocSession.ts:133-158) — 순서를 바꾸지 말 것
  GET  /api/collab/rooms/doc?room=...        서버 보관본이 있나?
    ├ 있음 → applyEncodedState
    └ 없음 → POST /doc/seed (디스크 내용 후보) → 200 이든 409 든 서버가 돌려준 바이너리를 적용
  그 다음에야  WebSocket /ws/collab?room=...  (CollabWebSocket 폴리필 필수)
  마지막에     new MonacoBinding(...)          (CodeEditor.jsx:1271-1276)

[타이핑] Monaco ─(y-monaco)→ Y.Text ─(WS)→ 팀원
            └─(400ms 디바운스)→ Redux fileContents   ※ 읽기 전용 스냅샷 (CodeEditor.jsx:1579-1589)

[저장]   isWriter() — awareness clientID 가 가장 작은 한 명만
  유휴 3초 / 최대 30초 (codeDocSession.ts:37,40)
    PUT /api/collab/rooms/doc/snapshot    (뒤늦게 들어온 사람이 받을 것)
    saveFile → saveFileApi(..., {allowEmpty:false})   (Git·실행이 보는 디스크)

[나가기] shouldSaveOnLeave() 판정 → 저장 → 그 다음에 disconnect   (destroy(), :339-394)
```

- **빈 내용으로는 시드하지 않는다**(`codeDocSession.ts:176`, 로그 없이 조용히 return). **빈 내용은 저장하지도 않는다**(`canPublish`, `:286-292`, `[협업] 빈 내용을 내보내지 않았습니다` 경고). 둘은 다른 방어다.
- `flush()`(`:295-326`)가 서버 → 디스크 순으로 저장한다. **Git 작업 전에 디스크를 최신으로 만들고 싶다면 이것을 부르는 경로를 새로 만들어야 한다.**
- 협업 문서는 **서버 메모리에만** 있다. 방이 비거나 백엔드를 재시작하면 사라진다(디스크가 원본이라 잃는 것은 없다). 이상 상태를 만나면 백엔드 재시작이 가장 빠른 초기화다.

## 2. 지켜야 할 규칙

① **`/ws/collab` 에는 반드시 `CollabWebSocket` 폴리필을 넘긴다**(`collabSocket.js`). 없으면 방이 `?room=` 이 아니라 URL 경로로 가서 전원이 `default-room` 에 모인다. 폴리필은 **생성자 안에서 매번 토큰을 읽는다**(액세스 토큰 15분).

② **팀 모드에서는 `<Editor>` 에 `value` 를 넘기지 않는다**(`CodeEditor.jsx:2712`). 넘기면 `@monaco-editor/react` 가 문서 전체를 갈아치우고 그것이 Yjs 로 퍼진다.

③ **bind 후에 `model.setValue()` 를 하지 않는다.** Git 작업 결과를 에디터에 반영하고 싶어도 여기서 하면 안 된다 — 빈 문자열·옛 내용이 CRDT 를 타고 퍼진다.

④ **Redux → 에디터 역주입 가드를 약화시키지 않는다**(`CodeEditor.jsx:653`, 조건: `팀 모드 && 바인딩 존재`). 단 **Redux 자체는 계속 최신으로 유지한다**(팀 모드도 400ms 뒤 dispatch — 되돌리면 실행 결과가 화면과 어긋나는 옛 버그가 재발). Git 작업 뒤 디스크 내용을 에디터에 보여 주고 싶어서 이 가드를 풀면 안 된다 — 협업 방 쪽에서 풀어야 한다(Git 절 6-2).

⑤ **시드에 쓸 디스크 내용은 Redux 를 먼저 본다.** `latestContentRef` 는 파일을 갈아탈 때 잠깐 빈 문자열일 수 있다.

⑥ **연결을 끊기 전에 저장 여부를 먼저 판단한다.** 끊고 나면 모두가 자기를 담당으로 여겨 옛 내용으로 덮는다. 브랜치 전환의 `closeAllFiles` 도 결국 `destroy()` 를 탄다.

⑦ **비동기 콜백을 추가할 때는 `isLiveSession()` 가드를 먼저 넣는다**(`CodeEditor.jsx:921-931` 지역 클로저). 늦게 도착한 콜백이 이미 갈아탄 새 세션에 쓰면 내용이 섞인다. **브랜치 전환도 파일 전환과 같은 위험을 가진다.**

⑧ **팀 모드 되돌리기는 `Y.UndoManager` 의 `trackedOrigins` 를 넓히지 않는다**(`CodeEditor.jsx:1293-1296`). 넓히면 팀원 편집·초기 `setValue` 까지 되돌아가 문서가 통째로 비고 그것이 퍼진다.

## 3. 과거 버그 — 방어를 걷어내면 그대로 재발한다

| 증상 | 근본 원인 | 지금의 방어 |
| --- | --- | --- |
| 파일을 열면 비어 있다 | 시드보다 WS 접속이 먼저였다 | `open()` 순서 |
| 새로 온 사람이 계속 빈 문서를 받는다 | 빈 파일을 방의 정본으로 시드했다 | `diskContent === ""` 면 시드 안 함 |
| 남의 파일 내용이 내 에디터에 | 폴리필 없이 `default-room` 에 모였다 | `CollabWebSocket` |
| 글자 롤백·커서 튐 | 팀 모드에 `value` 를 넘겼다 | `value={isTeamMode ? undefined : ...}` |
| 나가는 사람이 팀원 최신 내용을 덮는다 | disconnect 후 저장 판정 | `destroy()` 판정-선행 |
| 파일(브랜치) 전환 시 내용이 섞인다 | 늦은 콜백이 새 세션에 썼다 | `isLiveSession()` |
| 실행 결과가 화면과 다르다 | 팀 모드에서 Redux 를 갱신하지 않았다 | 400ms 뒤 항상 dispatch |
| 샌드박스에 기준 브랜치 내용이 저장된다 | 생성 시 이전 브랜치 버퍼가 남았다 | 생성 전 `closeAllFiles` |

## 4. 병합 충돌 편집 — 샌드박스 충돌도 이것을 쓴다

`CodeEditor.jsx` 가 `<<<<<<< / ======= / >>>>>>>` 를 직접 파싱해(`parseMergeConflicts`, `:234-272`) "내 것 / 상대 것 / 둘 다" UI 를 띄운다(`applyConflictEdit`, `:274-320`). 처음 감지한 원본을 `conflictOriginalContentRef`(`:397`)에 파일별로 보관해 선택을 되돌릴 수 있다. `GitDashboard` 에서 특정 충돌로 점프하는 것은 `ui` 슬라이스의 `conflictNavigationTarget`(`:2218-2250`). **이 경로는 팀 모드 여부를 보지 않고 모델을 직접 고쳐 Yjs 로 전파된다**(Git 절 6-3).

## 5. 팀 셸 `TeamIdeMain.jsx` 에서 Git 과 관련된 것

- **브랜치 전환 effect**(`:334-360`) — `activeBranch` 가 바뀌면 `closeAllFiles()` + `clearVirtualTree()` + `waivs:branch-context-changed`.
- **샌드박스 모드 표시** — `isSandboxMode` 는 브랜치 이름이 아니라 `state.sandbox.enabled` 로 판정한다. 켜지면 `bg-slate-900` 계열이 네 곳(최상위, 탐색기, 우측 패널, 탭 헤더)에 걸린다. `IdeMain` 에는 이 개념이 없다.
- 마운트 시 `activeProject`/`activeBranch` 를 세팅하지 않는다(`IdeMain.jsx:183-212` 의 복원 로직이 팀 쪽엔 없다).

## 6. 백엔드와 맞춰야 하는 계약 — 한쪽만 고치면 에러 없이 어긋난다

| 방 이름 형식 | 용도 | 조립하는 곳 |
| --- | --- | --- |
| `{workspaceId}:{project}:{branch}:{file}` | 코드 동시편집 (`/ws/collab`) | `CodeEditor.jsx:937-942` |
| `workspace:{id}:project:{name}:branch:{branch}` | 파일 트리 이벤트 (`/ws/workspace-events`) | `Sidebar.jsx:659` |

- 리터럴 접두어(`workspace:` 등)가 붙는 것은 **파일 트리 방뿐**이다. `normalizeCollabKeyPart(workspaceId, "workspace")` 의 두 번째 인자는 값이 비었을 때의 fallback 이지 접두사가 아니다.
- 브랜치 이름의 `/` 는 괜찮지만 `:` 는 방 이름을 깨뜨린다.
- 백엔드 `CollabRoomName.workspaceIdOf` 가 **방 이름의 첫 `:` 앞을 workspaceId 로 뽑아 멤버십을 검사**한다. 방 이름 규약이 곧 권한 검사의 근거라, 규약을 깨면 인증까지 같이 깨진다.
- **시드 409 에는 반드시 본문이 실려야 한다.** 프론트가 `codeDocApi.ts:78-81` 에서 가드 없이 `JSON.parse` 하므로 본문이 비면 에디터가 아예 안 열린다. (샌드박스 반영의 409 는 별개로 `throwApiResponseError` 경로다.)
- 백엔드 `WebSocketConfig.MAX_MESSAGE_BYTES`(1MB)를 낮추지 말 것. 문서 전체가 한 덩어리로 나가는 편집(되돌리기, 큰 파일)이 끊긴다(1009).

## 7. 문제를 추적할 때

브라우저 콘솔 순서: `[COLLAB ROOM ENTER]`(`CodeEditor.jsx:959`, 방 이름 — **브랜치 포함**) → `[YJS MonacoBinding created]`(`:1301`) → `[협업] 문서 로드 실패`(`codeDocSession.ts:156`). Git·샌드박스 결과는 터미널 패널의 `[Git] ...`.

| 증상 | 먼저 볼 곳 |
| --- | --- |
| 상대 글자가 안 보임 | 두 창의 방 이름. 한쪽이 샌드박스나 다른 브랜치일 수 있다 |
| 커밋에 방금 고친 내용이 빠짐 | 저장 담당자의 자동 저장(최대 30초)이 아직 안 나갔다 — Git 절 6-1 |
| Pull·병합·반영 뒤 옛 내용으로 덮임 | 열려 있던 협업 방이 옛 문서를 다시 저장했다 — Git 절 6-2 |
| 브랜치 드롭다운이 "No Project" | 팀 화면에서 `activeProject` 가 `null` — "시작 프로젝트로 설정" |
| 샌드박스에서 고친 내용이 팀원에게 보임 | 그 파일이 팀 방으로 열렸다. `[COLLAB ROOM ENTER]` 의 방 이름이 `sbx:` 로 시작하는지 본다 |
| 다른 PC 에서만 동시편집이 안 됨 | 아래 "함정" 첫 줄 |

---

## 함정

- **`/ws/collab` 은 `getWsBase()` 를 쓰지 않는다.** `collabSocket.js:3` 과 `codeDocSession.ts:34` 가 `NEXT_PUBLIC_WS_BASE_URL || "ws://localhost:8080"` 하드코딩이라, LAN 시연에서 파일 트리는 되는데 동시편집만 안 되면 이것이 원인이다. `getWsBase()` 를 쓰는 곳은 `Sidebar.jsx:755` 뿐이다.
- **`.js`/`.jsx` 는 `tsconfig.json` 의 `include` 에 개별 파일명으로 등록돼야 타입 검사 대상이 된다**(글롭은 `.ts`/`.tsx`/`.mts` 만). JS 파일을 옮기거나 지우면 목록도 고친다. 목록에 죽은 항목이 셋 있다(`new/extra/page.jsx`, `new/layout.jsx`, `app/providers.jsx`).
- **`@/` 는 `src/` 에만 매핑된다.** `app/` 아래는 상대경로로만 import 한다.
- `next.config.ts` 의 `reactStrictMode: false` 는 협업 코드의 이중 마운트를 피하려는 설정이다. 그래서 소켓·Yjs cleanup 누락이 개발 중 조용히 통과한다.

## 코드 스타일

- 파일 상단에 `// 경로: src/...` 주석을 단다.
- 주석은 한국어로, **왜 그렇게 해야 하는지**를 쓴다. 협업·저장 쪽 주석은 "예전에 어떤 버그가 났는가"의 기록이니 고치기 전에 전제를 먼저 읽는다. 커밋 메시지도 한국어.
- 새 코드는 TS, 기존 JS 파일은 굳이 변환하지 않는다. IDE 컴포넌트는 대부분 `.jsx`.
- 상태를 둘 곳: IDE 는 Redux(`fileSystem`·`ui`·`problems`), 동시편집 문서는 Yjs. **Yjs 데이터를 Redux 로 복제해 정본처럼 쓰지 말 것** — 팀 모드 Redux 는 읽기 전용 스냅샷이다.
- IDE 화면은 WAIVS 디자인 시스템(`--waivs-*`)보다 먼저 만들어져 자체 색(`#f0f2f5` 배경, 흰 패널)을 쓴다. IDE 안을 고칠 때는 그 화면의 기존 스타일에 맞춘다.
