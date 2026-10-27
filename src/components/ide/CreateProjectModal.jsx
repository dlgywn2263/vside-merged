"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { VscCheck } from "react-icons/vsc";
import { DiJava, DiPython, DiHtml5, DiReact } from "react-icons/di";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Code2,
  Cpu,
  FolderPlus,
  FolderTree,
  Github,
  Link2,
  PlayCircle,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { closeProjectModal, writeToTerminal } from "@/store/slices/uiSlice";
import {
  setProjectList,
  setWorkspaceTree,
  setActiveProject,
} from "@/store/slices/fileSystemSlice";
import {
  createProjectInWorkspaceApi,
  fetchWorkspaceProjectsApi,
  updateGitUrlApi,
} from "@/lib/ide/api";
import { getAivsHref } from "@/components/main-dashboard/dashboard.utils";
import SpringDependencyPicker from "@/components/ide/SpringDependencyPicker";

const OAUTH_RESULT_STORAGE_KEY = "wevaisGithubOAuthResult";
const OAUTH_PENDING_STORAGE_KEY = "wevaisPendingGitRemoteAction";
const OAUTH_RETURN_URL_STORAGE_KEY = "wevaisGithubOAuthReturnUrl";

const normalizeBaseUrl = (url = "") => {
  return String(url || "").replace(/\/+$/, "");
};

const API_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080",
);

const TEMPLATES = [
  {
    id: "spring",
    type: "SPRING_BOOT",
    lang: "JAVA",
    category: "server",
    name: "Spring Boot",
    desc: "엔터프라이즈급 REST API 및 JPA 활용",
    icon: <DiJava size={28} className="text-green-600" />,
    stack: ["Java", "Spring Boot", "JPA", "Gradle"],
    commands: ["./gradlew bootRun"],
    structure: [
      "src/main/java",
      "src/main/resources",
      "build.gradle",
      "application.yml",
      "README.md",
    ],
    detail:
      "Spring Boot 기반의 백엔드 작업 폴더입니다. REST API 개발, 데이터베이스 연동, JPA 기반 서버 구축에 적합합니다.",
  },
  {
    id: "react",
    type: "REACT",
    lang: "JAVASCRIPT",
    category: "frontend",
    name: "React",
    desc: "Vite 기반 컴포넌트형 프론트엔드",
    icon: <DiReact size={28} className="text-blue-400" />,
    stack: ["React", "Vite", "JavaScript", "CSS"],
    commands: ["npm install", "npm run dev"],
    structure: [
      "index.html",
      "src/main.jsx",
      "src/App.jsx",
      "src/style.css",
      "public",
      "package.json",
      "README.md",
    ],
    detail:
      "Vite 기반의 React 프론트엔드 작업 폴더입니다. 컴포넌트 중심 UI 개발과 빠른 화면 개발에 적합합니다.",
  },
  {
    id: "next",
    type: "NEXT",
    lang: "TYPESCRIPT",
    category: "frontend",
    name: "Next.js",
    desc: "React 기반 TypeScript 웹 프레임워크",
    icon: (
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
        N
      </div>
    ),
    stack: ["Next.js", "React", "TypeScript", "App Router"],
    commands: ["npm install", "npm run dev"],
    structure: [
      "app/layout.tsx",
      "app/page.tsx",
      "app/globals.css",
      "public",
      "next.config.mjs",
      "tsconfig.json",
      "next-env.d.ts",
      "package.json",
      "README.md",
    ],
    detail:
      "React 기반 Next.js 작업 폴더입니다. App Router와 TypeScript 구조를 사용하며 페이지 라우팅, 서버 렌더링, 웹 서비스 개발에 적합합니다.",
  },
  {
    id: "vanilla",
    type: "VANILLA",
    lang: "HTML",
    category: "frontend",
    name: "Vanilla Web",
    desc: "HTML / CSS / JS 빌드 없는 기본 웹",
    icon: <DiHtml5 size={28} className="text-orange-500" />,
    stack: ["HTML", "CSS", "JavaScript"],
    commands: ["Open with Live Server"],
    structure: ["index.html", "style.css", "script.js", "assets/images"],
    detail:
      "HTML, CSS, JavaScript만으로 구성된 기본 웹 작업 폴더입니다. 별도의 빌드 과정 없이 빠르게 웹 페이지를 제작할 수 있습니다.",
  },
  {
    id: "console_java",
    type: "CONSOLE",
    lang: "JAVA",
    category: "console",
    name: "Java Console",
    desc: "객체지향 기본 학습 및 알고리즘",
    icon: <DiJava size={28} className="text-orange-400" />,
    stack: ["Java"],
    commands: ["javac Main.java", "java Main"],
    structure: ["src/Main.java", "README.md"],
    detail:
      "Java 기반의 콘솔 작업 폴더입니다. 객체지향 프로그래밍 학습과 알고리즘 및 자료구조 문제 풀이에 적합합니다.",
  },
  {
    id: "console_py",
    type: "CONSOLE",
    lang: "PYTHON",
    category: "console",
    name: "Python Console",
    desc: "가벼운 스크립트, 코딩 테스트",
    icon: <DiPython size={28} className="text-blue-500" />,
    stack: ["Python"],
    commands: ["python main.py"],
    structure: ["main.py", "requirements.txt", "README.md"],
    detail:
      "Python 기반의 콘솔 작업 폴더입니다. 간단한 스크립트 작성, 자동화 작업, 코딩 테스트 및 데이터 처리에 적합합니다.",
  },
  {
    id: "console_cpp",
    type: "CONSOLE",
    lang: "CPP",
    category: "console",
    name: "C / C++ Console",
    desc: "알고리즘 및 시스템 프로그래밍",
    icon: <div className="text-sm font-black text-blue-600">C++</div>,
    stack: ["C", "C++"],
    commands: ["g++ main.cpp -o main", "./main"],
    structure: ["main.cpp", "include/vector", "README.md"],
    detail:
      "C/C++ 기반의 콘솔 작업 폴더입니다. 알고리즘 문제 풀이와 시스템 프로그래밍 및 성능 중심 개발에 적합합니다.",
  },
];

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "frontend", label: "프론트엔드" },
  { id: "server", label: "서버" },
  { id: "console", label: "콘솔" },
];

const normalizeGitHubRepoUrl = (rawUrl = "") => {
  const value = String(rawUrl || "").trim();

  if (!value) return "";

  if (value.startsWith("git@github.com:")) {
    const repoPath = value.replace("git@github.com:", "").replace(/\.git$/, "");
    return `https://github.com/${repoPath}.git`;
  }

  if (value.startsWith("http://github.com/")) {
    return value.replace("http://github.com/", "https://github.com/");
  }

  return value;
};

const isValidGitHubRepoUrl = (rawUrl = "") => {
  const url = normalizeGitHubRepoUrl(rawUrl);

  if (!url) return true;

  return /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(
    url,
  );
};

const getStoredAccessToken = () => {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("authToken") ||
    ""
  );
};

const getGithubAccountName = (status) => {
  return status?.username || status?.login || status?.githubUsername || "";
};

async function fetchGithubStatusApi() {
  const token = getStoredAccessToken();

  const response = await fetch(`${API_BASE_URL}/api/github/status`, {
    method: "GET",
    credentials: "include",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (response.status === 404 || response.status === 500) {
    return {
      connected: false,
    };
  }

  if (!response.ok) {
    throw new Error("GitHub 계정 연결 상태를 확인하지 못했습니다.");
  }

  const data = await response.json();

  return {
    connected: Boolean(data.connected ?? data.linked ?? data.githubLinked),
    username: data.username ?? data.githubUsername ?? data.login ?? null,
    login: data.login ?? null,
    email: data.email ?? data.githubEmail ?? null,
    avatarUrl: data.avatarUrl ?? data.githubAvatarUrl ?? null,
    connectedAt: data.connectedAt ?? data.updatedAt ?? null,
  };
}

function openGithubAccountOAuth() {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;

  if (!clientId) {
    alert(
      "GitHub OAuth 설정이 없습니다.\n.env.local에 NEXT_PUBLIC_GITHUB_CLIENT_ID를 추가해주세요.",
    );
    return;
  }

  const statePayload = {
    source: "work-folder-create",
    action: "account-link",
    requestedAt: Date.now(),
  };

  window.sessionStorage.setItem(
    OAUTH_PENDING_STORAGE_KEY,
    JSON.stringify(statePayload),
  );

  window.sessionStorage.setItem(
    OAUTH_RETURN_URL_STORAGE_KEY,
    window.location.href,
  );

  const authUrl = new URL("https://github.com/login/oauth/authorize");

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "repo");
  authUrl.searchParams.set(
    "redirect_uri",
    `${window.location.origin}/auth/github/callback`,
  );
  authUrl.searchParams.set("state", JSON.stringify(statePayload));

  window.location.assign(authUrl.toString());
}

export default function CreateProjectModal({
  redirectToIdeAfterCreate = false,
  ideMode = "personal",
} = {}) {
  const router = useRouter();
  const dispatch = useDispatch();

  const { isProjectModalVisible } = useSelector((state) => state.ui);
  const { workspaceId } = useSelector((state) => state.fileSystem);

  const [step, setStep] = useState(1);
  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const [gitUrl, setGitUrl] = useState("");
  const [gitConnectMode, setGitConnectMode] = useState("later");
  const [githubStatus, setGithubStatus] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [springDependencies, setSpringDependencies] = useState([]);

  const selectedTemplate = useMemo(() => {
    return TEMPLATES.find((template) => template.id === selectedTemplateId);
  }, [selectedTemplateId]);

  const filteredTemplates = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return TEMPLATES.filter((template) => {
      const matchesFilter = filter === "all" || template.category === filter;

      const matchesKeyword =
        !normalizedKeyword ||
        template.name.toLowerCase().includes(normalizedKeyword) ||
        template.desc.toLowerCase().includes(normalizedKeyword) ||
        template.lang.toLowerCase().includes(normalizedKeyword) ||
        template.type.toLowerCase().includes(normalizedKeyword) ||
        template.stack.some((item) =>
          item.toLowerCase().includes(normalizedKeyword),
        );

      return matchesFilter && matchesKeyword;
    });
  }, [filter, keyword]);

  const githubName = getGithubAccountName(githubStatus);
  const isGithubConnected = Boolean(githubStatus?.connected);

  const normalizedGitUrl =
    gitConnectMode === "repo" ? normalizeGitHubRepoUrl(gitUrl) : "";

  const isGitUrlInvalid =
    gitConnectMode === "repo" &&
    Boolean(normalizedGitUrl) &&
    !isValidGitHubRepoUrl(normalizedGitUrl);

  const isRepoModeInvalid =
    gitConnectMode === "repo" && (!isGithubConnected || !normalizedGitUrl);

  const isCreateDisabled =
    isSubmitting ||
    !formData.name.trim() ||
    !selectedTemplate ||
    isGitUrlInvalid ||
    isRepoModeInvalid;

  const loadGithubStatus = async () => {
    try {
      setGithubLoading(true);
      setGithubError("");

      const status = await fetchGithubStatusApi();
      setGithubStatus(status);

      if (!status.connected) {
        setGitConnectMode("later");
      }
    } catch (error) {
      setGithubStatus({
        connected: false,
      });

      setGithubError(
        error instanceof Error
          ? error.message
          : "GitHub 연결 상태를 확인하지 못했습니다.",
      );

      setGitConnectMode("later");
    } finally {
      setGithubLoading(false);
    }
  };

  useEffect(() => {
    if (!isProjectModalVisible) return;

    loadGithubStatus();
  }, [isProjectModalVisible]);

  useEffect(() => {
    if (!isProjectModalVisible) return;
    if (typeof window === "undefined") return;

    const rawResult = window.sessionStorage.getItem(OAUTH_RESULT_STORAGE_KEY);
    if (!rawResult) return;

    window.sessionStorage.removeItem(OAUTH_RESULT_STORAGE_KEY);

    try {
      const result = JSON.parse(rawResult);

      if (result.status === "success") {
        setGithubError("");
        loadGithubStatus();
        return;
      }

      if (result.status === "error") {
        setGithubError(
          result.message || "GitHub 인증 처리 중 문제가 발생했습니다.",
        );
      }
    } catch {
      setGithubError("GitHub 인증 결과를 확인하지 못했습니다.");
    }
  }, [isProjectModalVisible]);

  const resetModalState = () => {
    setStep(1);
    setFilter("all");
    setKeyword("");
    setSelectedTemplateId(null);
    setFormData({
      name: "",
      description: "",
    });
    setGitUrl("");
    setGitConnectMode("later");
    setSpringDependencies([]);
    setGithubStatus(null);
    setGithubLoading(false);
    setGithubError("");
  };

  const handleClose = () => {
    if (isSubmitting) return;

    dispatch(closeProjectModal());
    resetModalState();
  };

  // ESC 로 닫기. 닫기 버튼과 같은 handleClose 를 타므로 생성 중에는 닫히지 않는다.
  useEffect(() => {
    if (!isProjectModalVisible) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProjectModalVisible, handleClose]);

  const handleNext = () => {
    if (!selectedTemplateId) {
      alert("원하시는 템플릿을 선택해주세요.");
      return;
    }

    setStep(2);
  };

  const handleSubmit = async () => {
    if (!workspaceId) {
      alert("선택된 워크스페이스가 없습니다.");
      return;
    }

    if (!formData.name.trim()) {
      alert("작업 폴더 이름을 입력해주세요.");
      return;
    }

    if (!selectedTemplate) {
      alert("선택된 템플릿 정보를 찾을 수 없습니다.");
      return;
    }

    if (gitConnectMode === "repo" && !isGithubConnected) {
      alert("GitHub 계정 연결 후 저장소를 연결할 수 있습니다.");
      return;
    }

    if (gitConnectMode === "repo" && !normalizedGitUrl) {
      alert("연결할 GitHub 저장소 URL을 입력해주세요.");
      return;
    }

    if (normalizedGitUrl && !isValidGitHubRepoUrl(normalizedGitUrl)) {
      alert(
        "GitHub 저장소 주소 형식이 올바르지 않습니다.\n\n예시: https://github.com/username/repository.git",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedName = formData.name.trim();
      const trimmedDescription = formData.description.trim();

      await createProjectInWorkspaceApi({
        workspaceId,
        projectName: trimmedName,
        language: selectedTemplate.lang,
        description: trimmedDescription,
        gitUrl: normalizedGitUrl || null,
        templateType: selectedTemplate.type,
        // 템플릿을 바꿔 가며 고른 경우에도 스프링부트일 때만 보낸다.
        dependencies:
          selectedTemplate.type === "SPRING_BOOT" ? springDependencies : [],
      });

      if (normalizedGitUrl) {
        await updateGitUrlApi(workspaceId, trimmedName, normalizedGitUrl);
      }

      dispatch(
        writeToTerminal(
          `[System] '${trimmedName}' 작업 폴더가 [${selectedTemplate.name}] 템플릿으로 생성되었습니다.\n`,
        ),
      );

      if (normalizedGitUrl) {
        dispatch(
          writeToTerminal(
            `[Git] '${trimmedName}' 작업 폴더에 저장소가 연결되었습니다: ${normalizedGitUrl}\n`,
          ),
        );
      }

      const projectsRoot = await fetchWorkspaceProjectsApi(workspaceId);

      dispatch(setProjectList(projectsRoot.children || []));
      dispatch(setWorkspaceTree(projectsRoot));
      dispatch(setActiveProject(trimmedName));

      dispatch(
        writeToTerminal(
          `[System] 시작 작업 폴더가 변경되었습니다: ${trimmedName}\n`,
        ),
      );

      dispatch(closeProjectModal());
      resetModalState();

      if (redirectToIdeAfterCreate) {
        router.push(getAivsHref(workspaceId, ideMode));
      }
    } catch (error) {
      alert(
        "생성 실패: " +
          (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFileTree = (paths) => {
    const tree = {};

    paths.forEach((path) => {
      const parts = path.split("/").filter(Boolean);
      let current = tree;

      parts.forEach((part) => {
        if (!current[part]) {
          current[part] = {};
        }

        current = current[part];
      });
    });

    const renderNode = (node, depth = 0) => {
      const entries = Object.entries(node);

      return entries.map(([name, children], index) => {
        const isLast = index === entries.length - 1;
        const hasChildren = Object.keys(children).length > 0;

        return (
          <div key={`${depth}-${name}-${index}`}>
            <div
              className="flex items-center"
              style={{ paddingLeft: `${depth * 16}px` }}
            >
              <span className="mr-1.5 select-none text-slate-600">
                {isLast ? "└─" : "├─"}
              </span>

              <span
                className={
                  hasChildren
                    ? "font-medium text-[#93A8FF]"
                    : "text-slate-300"
                }
              >
                {hasChildren ? "▾ " : ""}
                {name}
              </span>
            </div>

            {hasChildren && renderNode(children, depth + 1)}
          </div>
        );
      });
    };

    return renderNode(tree);
  };

  if (!isProjectModalVisible) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
      {/* 두 단계의 모달 높이를 같게 고정해 단계를 바꿔도 헤더·버튼 위치가 움직이지 않게 한다.
          스크롤은 본문 안의 각 영역(템플릿 목록·입력 폼 등)이 따로 갖는다. */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-work-folder-title"
        className="flex h-[min(86dvh,880px)] w-full max-w-[1320px] flex-col overflow-hidden rounded-[18px] border border-[#E5EAF3] bg-white shadow-[0_16px_48px_rgba(15,23,42,0.12)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#E5EAF3] px-6 py-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5873F9]">
              Work Folder Create
            </p>

            <h1
              id="create-work-folder-title"
              className="mt-1 text-xl font-bold tracking-tight text-[#111827]"
            >
              작업 폴더 생성
            </h1>

            <p className="mt-0.5 truncate text-[13px] text-[#64748B]">
              현재 프로젝트 안에서 사용할 개발 작업 폴더를 생성합니다.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <StepBadge step={step} />

            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94A3B8] transition-colors hover:bg-slate-100 hover:text-[#475569] disabled:opacity-50"
              aria-label="작업 폴더 생성 닫기"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
          {step === 1 ? (
            <div className="grid grid-cols-1 lg:h-full lg:grid-cols-[320px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
              <aside className="flex min-h-0 flex-col border-b border-[#E5EAF3] bg-[#FAFBFC] lg:border-b-0 lg:border-r">
                <div className="shrink-0 space-y-2.5 px-4 pb-3 pt-4">
                  <div className="relative">
                    <Search
                      size={15}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
                    />

                    <input
                      value={keyword}
                      onChange={(event) => setKeyword(event.target.value)}
                      placeholder="템플릿 또는 기술 검색"
                      aria-label="템플릿 검색"
                      className="h-10 w-full rounded-lg border border-[#E5EAF3] bg-white pl-9 pr-3 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/15"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {FILTERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={filter === item.id}
                        onClick={() => {
                          setFilter(item.id);
                          setSelectedTemplateId(null);
                        }}
                        className={[
                          "h-8 rounded-lg text-xs font-semibold transition-colors",
                          filter === item.id
                            ? "bg-[#5873F9] text-white"
                            : "border border-[#E5EAF3] bg-white text-[#475569] hover:border-[#C9D4FF] hover:text-[#5873F9]",
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-h-[320px] min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-4 lg:max-h-none">
                  {filteredTemplates.length === 0 ? (
                    <div className="px-4 py-10 text-center text-[13px] text-[#94A3B8]">
                      조건에 맞는 템플릿이 없습니다.
                    </div>
                  ) : (
                    filteredTemplates.map((template) => {
                      const isSelected = selectedTemplateId === template.id;

                      return (
                        <button
                          key={template.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={[
                            "flex h-[70px] w-full items-center gap-3 rounded-xl border px-3 text-left transition-colors",
                            isSelected
                              ? "border-[#5873F9] bg-[#F5F8FF]"
                              : "border-[#E5EAF3] bg-white hover:border-[#C9D4FF]",
                          ].join(" ")}
                        >
                          <TemplateIcon template={template} />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-semibold text-[#111827]">
                                {template.name}
                              </p>

                              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] ring-1 ring-inset ring-[#E5EAF3]">
                                {template.lang}
                              </span>
                            </div>

                            <p className="mt-0.5 truncate text-xs text-[#64748B]">
                              {template.desc}
                            </p>
                          </div>

                          {isSelected && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5873F9] text-white">
                              <VscCheck size={12} />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <main className="min-h-0 lg:overflow-hidden">
                {!selectedTemplate ? (
                  <div className="flex h-full min-h-[280px] items-center justify-center px-6 py-10">
                    <div className="max-w-xs text-center">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F8FF] text-[#5873F9]">
                        <Code2 size={20} />
                      </div>

                      <h3 className="text-[15px] font-semibold text-[#111827]">
                        템플릿을 선택해주세요
                      </h3>

                      <p className="mt-1.5 text-[13px] leading-5 text-[#64748B]">
                        왼쪽에서 템플릿을 선택하면 생성 파일 구조와 실행 방법을
                        확인할 수 있습니다.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col lg:h-full">
                    {/* A. 선택한 템플릿 요약 */}
                    <div className="flex shrink-0 items-center gap-4 border-b border-[#E5EAF3] px-6 py-4">
                      <TemplateIcon template={selectedTemplate} size="lg" />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h2 className="text-[17px] font-bold tracking-tight text-[#111827]">
                            {selectedTemplate.name}
                          </h2>

                          <span className="rounded-md bg-[#EEF3FF] px-2 py-0.5 text-[11px] font-semibold text-[#5873F9]">
                            {selectedTemplate.lang}
                          </span>

                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-[#64748B]">
                            {selectedTemplate.type}
                          </span>
                        </div>

                        <p
                          className="mt-1 truncate text-[13px] text-[#64748B]"
                          title={selectedTemplate.detail}
                        >
                          {selectedTemplate.detail}
                        </p>
                      </div>
                    </div>

                    <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] lg:grid-rows-[minmax(0,1fr)]">
                      {/* B. 생성 파일 구조 — 이 단계에서 가장 비중이 큰 정보 */}
                      <section className="flex min-h-0 flex-col border-b border-[#E5EAF3] px-6 py-5 lg:border-b-0 lg:border-r">
                        <PaneTitle
                          icon={FolderTree}
                          title="생성 파일 구조"
                          hint="템플릿 적용 시 만들어지는 기본 디렉터리"
                        />

                        <div className="mt-3 min-h-[180px] overflow-auto rounded-xl bg-[#0F172A] px-4 py-3 font-mono text-[12.5px] leading-6 text-slate-200 lg:min-h-0 lg:flex-1">
                          <div className="font-semibold text-[#93A8FF]">
                            ▾ work-folder
                          </div>
                          {renderFileTree(selectedTemplate.structure)}
                        </div>
                      </section>

                      {/* C. 기술 스택 · 실행 방법 */}
                      <section className="min-h-0 space-y-6 px-6 py-5 lg:overflow-y-auto">
                        <div>
                          <PaneTitle
                            icon={Cpu}
                            title="기술 스택"
                            hint="초기 작업 폴더에 포함"
                          />

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {selectedTemplate.stack.map((item) => (
                              <span
                                key={item}
                                className="rounded-full bg-[#F5F8FF] px-2.5 py-1 text-xs font-medium text-[#4A63E0] ring-1 ring-inset ring-[#DCE4FF]"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <PaneTitle
                            icon={PlayCircle}
                            title="실행 방법"
                            hint="생성 후 터미널에서 실행"
                          />

                          <div className="mt-3 divide-y divide-[#E5EAF3] overflow-hidden rounded-lg border border-[#E5EAF3] bg-[#F7F8FA]">
                            {selectedTemplate.commands.map((command) => (
                              <div
                                key={command}
                                className="truncate px-3 py-2 font-mono text-[12.5px] text-[#334155]"
                              >
                                <span className="mr-2 select-none text-[#94A3B8]">
                                  $
                                </span>
                                {command}
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                )}
              </main>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:h-full lg:grid-cols-[minmax(0,58fr)_minmax(0,42fr)] lg:grid-rows-[minmax(0,1fr)]">
              <main className="min-h-0 border-b border-[#E5EAF3] px-6 py-5 lg:overflow-y-auto lg:border-b-0 lg:border-r">
                <div className="mx-auto max-w-[680px] space-y-4">
                  {/* A. 선택한 템플릿 — 오른쪽에 자세히 나오므로 여기서는 한 줄 */}
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                    <span className="mr-1 text-[#94A3B8]">선택한 템플릿</span>

                    <span className="rounded-md bg-[#EEF3FF] px-2 py-0.5 font-semibold text-[#5873F9]">
                      {selectedTemplate?.lang}
                    </span>

                    {selectedTemplate?.stack.map((item) => (
                      <span
                        key={item}
                        className="text-[#475569] before:mr-1.5 before:text-[#CBD5E1] before:content-['·']"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  {/* B. 작업 폴더 이름 */}
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-[#334155]">
                      작업 폴더 이름 <span className="text-[#5873F9]">*</span>
                    </span>

                    <input
                      autoFocus
                      placeholder="예: backend-auth-server"
                      className="h-11 w-full min-w-0 rounded-lg border border-[#E5EAF3] bg-white px-3.5 text-sm font-medium text-[#111827] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/15"
                      value={formData.name}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          name: event.target.value,
                        })
                      }
                    />
                  </label>

                  {/* C. 작업 설명 */}
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-[#334155]">
                      작업 설명{" "}
                      <span className="text-xs font-normal text-[#94A3B8]">
                        (선택)
                      </span>
                    </span>

                    <textarea
                      placeholder="이 작업 폴더에서 구현할 기능을 입력하세요."
                      rows={2}
                      className="h-[76px] w-full resize-none rounded-lg border border-[#E5EAF3] bg-white px-3.5 py-2.5 text-sm leading-6 text-[#111827] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/15"
                      value={formData.description}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          description: event.target.value,
                        })
                      }
                    />
                  </label>

                  {selectedTemplate?.type === "SPRING_BOOT" && (
                    <SpringDependencyPicker
                      value={springDependencies}
                      onChange={setSpringDependencies}
                      disabled={isSubmitting}
                    />
                  )}

                  {/* D. GitHub 저장소 연결 — 선택 사항이라 입력 흐름을 막지 않게 낮게 둔다 */}
                  <section className="border-t border-[#E5EAF3] pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-[#334155]">
                          GitHub 저장소 연결{" "}
                          <span className="text-xs font-normal text-[#94A3B8]">
                            (선택)
                          </span>
                        </h2>
                        <p className="mt-0.5 text-xs text-[#94A3B8]">
                          GitHub 계정은 사용자 단위, 저장소는 작업 폴더 단위로
                          연결합니다.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={loadGithubStatus}
                        disabled={githubLoading}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#E5EAF3] bg-white px-2.5 text-xs font-semibold text-[#475569] transition-colors hover:border-[#C9D4FF] hover:text-[#5873F9] disabled:opacity-50"
                      >
                        <RefreshCw
                          size={13}
                          className={githubLoading ? "animate-spin" : ""}
                        />
                        연결 확인
                      </button>
                    </div>

                    <div
                      className={[
                        "mt-3 flex items-start gap-2.5 rounded-lg px-3 py-2.5",
                        githubLoading
                          ? "bg-[#F7F8FA]"
                          : isGithubConnected
                            ? "bg-emerald-50"
                            : "bg-amber-50/70",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "mt-0.5 shrink-0",
                          githubLoading
                            ? "text-[#94A3B8]"
                            : isGithubConnected
                              ? "text-emerald-600"
                              : "text-amber-600",
                        ].join(" ")}
                      >
                        {isGithubConnected ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          <AlertCircle size={15} />
                        )}
                      </span>

                      <div className="min-w-0 text-xs leading-5">
                        <p className="font-semibold text-[#111827]">
                          {githubLoading
                            ? "GitHub 계정 연결 상태 확인 중"
                            : isGithubConnected
                              ? `GitHub 계정: ${githubName || "연결됨"}`
                              : "GitHub 계정 연결이 필요합니다."}
                        </p>

                        <p className="text-[#64748B]">
                          {isGithubConnected
                            ? "작업 폴더에 저장소 URL을 연결할 수 있습니다."
                            : "연결하지 않아도 작업 폴더를 생성할 수 있습니다."}
                        </p>

                        {githubError && (
                          <p className="mt-0.5 font-semibold text-amber-700">
                            {githubError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {isGithubConnected ? (
                        <>
                          <GithubOptionCard
                            selected={gitConnectMode === "repo"}
                            icon={Link2}
                            title="기존 저장소 연결"
                            description="Repository URL을 입력해 생성 즉시 연결합니다."
                            onClick={() => setGitConnectMode("repo")}
                          />

                          <GithubOptionCard
                            selected={gitConnectMode === "later"}
                            icon={Github}
                            title="나중에 연결"
                            description="IDE의 Source Control에서 나중에 연결합니다."
                            onClick={() => {
                              setGitConnectMode("later");
                              setGitUrl("");
                            }}
                          />
                        </>
                      ) : (
                        <>
                          <GithubOptionCard
                            selected={false}
                            icon={Github}
                            title="GitHub 연결하기"
                            description="GitHub 인증 후 이 화면으로 돌아옵니다."
                            onClick={openGithubAccountOAuth}
                          />

                          <GithubOptionCard
                            selected={gitConnectMode === "later"}
                            icon={Link2}
                            title="나중에 연결"
                            description="저장소 없이 작업 폴더를 먼저 생성합니다."
                            onClick={() => {
                              setGitConnectMode("later");
                              setGitUrl("");
                            }}
                          />
                        </>
                      )}
                    </div>

                    <label className="mt-3 block">
                      <span className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-[#475569]">
                          GitHub 저장소 URL
                        </span>

                        <span className="text-[11px] text-[#94A3B8]">
                          선택 입력
                        </span>
                      </span>

                      <input
                        className={[
                          "h-10 w-full rounded-lg px-3.5 font-mono text-[13px] outline-none transition-colors",
                          !isGithubConnected
                            ? "cursor-not-allowed border border-[#E5EAF3] bg-[#F7F8FA] text-[#94A3B8]"
                            : isGitUrlInvalid
                              ? "border border-red-300 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-100"
                              : "border border-[#E5EAF3] bg-white text-[#111827] placeholder:text-[#94A3B8] focus:border-[#5873F9] focus:ring-2 focus:ring-[#5873F9]/15",
                        ].join(" ")}
                        placeholder={
                          isGithubConnected
                            ? "https://github.com/username/repository.git"
                            : "GitHub 계정 연결 후 입력할 수 있습니다."
                        }
                        value={gitUrl}
                        disabled={!isGithubConnected}
                        onFocus={() => {
                          if (isGithubConnected) {
                            setGitConnectMode("repo");
                          }
                        }}
                        onChange={(event) => {
                          setGitConnectMode("repo");
                          setGitUrl(event.target.value);
                        }}
                        onBlur={(event) =>
                          setGitUrl(normalizeGitHubRepoUrl(event.target.value))
                        }
                      />
                    </label>

                    {isGitUrlInvalid ? (
                      <p className="mt-1.5 text-xs font-semibold text-red-600">
                        GitHub 저장소 주소는
                        https://github.com/username/repository.git 형식이어야
                        합니다.
                      </p>
                    ) : isGithubConnected ? (
                      <p className="mt-1.5 text-xs text-[#94A3B8]">
                        SSH 주소를 입력하면 가능한 경우 HTTPS 주소로 자동
                        변환합니다.
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-[#94A3B8]">
                        GitHub 계정을 먼저 연결하면 저장소 URL을 입력할 수
                        있습니다.
                      </p>
                    )}
                  </section>
                </div>
              </main>

              {/* 읽기 전용 참고 영역 — 입력 폼보다 튀지 않게 배경만 살짝 낮춘다 */}
              <aside className="flex min-h-0 flex-col bg-[#FAFBFC] px-6 py-5 lg:overflow-y-auto">
                <p className="text-[11px] font-semibold text-[#94A3B8]">
                  선택한 템플릿
                </p>

                <div className="mt-2 flex items-start gap-3">
                  {selectedTemplate && (
                    <TemplateIcon template={selectedTemplate} />
                  )}

                  <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-[#111827]">
                      {selectedTemplate?.name}
                    </h2>

                    <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#64748B]">
                      {selectedTemplate?.detail}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex min-h-0 flex-col lg:flex-1">
                  <PaneTitle
                    icon={FolderTree}
                    title="생성 파일 구조"
                    hint="생성될 작업 폴더의 기본 구조"
                  />

                  <div className="mt-3 overflow-auto rounded-xl bg-[#0F172A] px-4 py-3 font-mono text-[12.5px] leading-6 text-slate-200 lg:min-h-0">
                    <div className="font-semibold text-[#93A8FF]">
                      ▾ {formData.name.trim() || "work-folder"}
                    </div>

                    {selectedTemplate
                      ? renderFileTree(selectedTemplate.structure)
                      : null}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#E5EAF3] bg-[#FAFBFC] px-6 py-4">
          <div className="hidden min-w-0 items-center gap-2 text-xs text-[#64748B] sm:flex">
            <CheckCircle2 size={15} className="shrink-0 text-[#5873F9]" />
            <span className="truncate">
              현재 선택된 프로젝트 안에 작업 폴더가 생성됩니다.
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#E5EAF3] bg-white px-4 text-sm font-semibold text-[#475569] transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                <ArrowLeft size={15} />
                이전
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-10 rounded-lg border border-[#E5EAF3] bg-white px-4 text-sm font-semibold text-[#475569] transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              취소
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!selectedTemplateId}
                className="inline-flex h-10 min-w-[128px] items-center justify-center gap-1.5 rounded-lg bg-[#5873F9] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4965E8] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                다음 단계
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isCreateDisabled}
                className="inline-flex h-10 min-w-[128px] items-center justify-center gap-1.5 rounded-lg bg-[#5873F9] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#4965E8] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isSubmitting ? "생성 중..." : "작업 폴더 만들기"}
                <FolderPlus size={15} />
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}

function StepBadge({ step }) {
  return (
    <ol className="hidden items-center gap-1.5 md:flex">
      {["템플릿 선택", "작업 폴더 설정"].map((label, index) => {
        const stepNumber = index + 1;
        const isActive = step === stepNumber;
        const isDone = step > stepNumber;

        return (
          <li key={label} className="flex items-center gap-1.5">
            <div
              aria-current={isActive ? "step" : undefined}
              className={[
                "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold",
                isActive
                  ? "bg-[#5873F9] text-white"
                  : isDone
                    ? "bg-[#EEF3FF] text-[#5873F9]"
                    : "bg-slate-100 text-[#94A3B8]",
              ].join(" ")}
            >
              {isDone ? (
                <Check size={13} strokeWidth={3} />
              ) : (
                <span>{stepNumber}</span>
              )}
              <span>{label}</span>
            </div>

            {index === 0 && <div className="h-px w-4 bg-[#E5EAF3]" />}
          </li>
        );
      })}
    </ol>
  );
}

// 템플릿 아이콘을 같은 크기의 상자에 담는다. 목록·요약·참고 영역이 함께 쓴다.
function TemplateIcon({ template, size = "md" }) {
  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center rounded-lg border border-[#EEF1F6] bg-[#F7F8FA]",
        size === "lg" ? "h-12 w-12" : "h-10 w-10",
      ].join(" ")}
    >
      {template.icon}
    </div>
  );
}

function PaneTitle({ icon: Icon, title, hint }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={15} className="shrink-0 text-[#5873F9]" />
      <h3 className="text-[13px] font-semibold text-[#111827]">{title}</h3>
      {hint && (
        <span className="truncate text-xs text-[#94A3B8]">{hint}</span>
      )}
    </div>
  );
}

function GithubOptionCard({
  selected,
  disabled = false,
  icon: Icon,
  title,
  description,
  badge,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
        disabled
          ? "cursor-not-allowed border-[#E5EAF3] bg-[#F7F8FA] opacity-60"
          : selected
            ? "border-[#5873F9] bg-[#F5F8FF]"
            : "border-[#E5EAF3] bg-white hover:border-[#C9D4FF]",
      ].join(" ")}
    >
      <Icon
        size={16}
        className={[
          "shrink-0",
          selected ? "text-[#5873F9]" : "text-[#64748B]",
        ].join(" ")}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-semibold text-[#111827]">{title}</p>
          {badge && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B]">
              {badge}
            </span>
          )}
        </div>

        <p className="truncate text-[11px] text-[#94A3B8]" title={description}>
          {description}
        </p>
      </div>

      {selected && (
        <CheckCircle2 size={15} className="shrink-0 text-[#5873F9]" />
      )}
    </button>
  );
}
