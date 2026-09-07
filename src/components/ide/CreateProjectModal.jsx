"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { VscCheck } from "react-icons/vsc";
import { DiJava, DiPython, DiHtml5, DiReact } from "react-icons/di";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Cpu,
  FolderPlus,
  Github,
  Link2,
  PlayCircle,
  RefreshCw,
  Rocket,
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
    icon: <DiJava size={38} className="text-green-600" />,
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
    icon: <DiReact size={38} className="text-blue-400" />,
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
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
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
    icon: <DiHtml5 size={38} className="text-orange-500" />,
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
    icon: <DiJava size={38} className="text-orange-400" />,
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
    icon: <DiPython size={38} className="text-blue-500" />,
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
    icon: <div className="text-xl font-black text-blue-600">C++</div>,
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
    setGithubStatus(null);
    setGithubLoading(false);
    setGithubError("");
  };

  const handleClose = () => {
    if (isSubmitting) return;

    dispatch(closeProjectModal());
    resetModalState();
  };

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
              className="flex items-center leading-5"
              style={{ paddingLeft: `${depth * 16}px` }}
            >
              <span className="mr-1 text-slate-500">
                {isLast ? "└─" : "├─"}
              </span>

              <span
                className={
                  hasChildren
                    ? "font-medium text-blue-300"
                    : "text-slate-200"
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <section className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[26px] border border-blue-100 bg-white shadow-2xl">
        <div className="border-b border-blue-50 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                Work Folder Create
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                작업 폴더 생성
              </h1>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                현재 프로젝트 안에서 사용할 개발 작업 폴더와 템플릿을
                선택하세요.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <StepBadge step={step} />

              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-white text-slate-500 transition hover:bg-blue-50 disabled:opacity-50"
                aria-label="작업 폴더 생성 닫기"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === 1 ? (
            <div className="grid grid-cols-1 gap-0 lg:grid-cols-[330px_1fr]">
              <aside className="border-b border-blue-50 bg-blue-50/40 p-5 lg:border-b-0 lg:border-r">
                <div className="relative mb-3">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="템플릿 또는 기술 검색"
                    className="h-10 w-full rounded-xl border border-blue-100 bg-white pl-10 pr-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2">
                  {FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setFilter(item.id);
                        setSelectedTemplateId(null);
                      }}
                      className={[
                        "h-9 rounded-xl text-xs font-black transition",
                        filter === item.id
                          ? "bg-blue-600 text-white shadow-sm"
                          : "border border-blue-100 bg-white text-slate-500 hover:bg-blue-50",
                      ].join(" ")}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                  {filteredTemplates.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-blue-100 bg-white px-4 py-8 text-center text-sm font-bold text-slate-400">
                      조건에 맞는 템플릿이 없습니다.
                    </div>
                  ) : (
                    filteredTemplates.map((template) => {
                      const isSelected = selectedTemplateId === template.id;

                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={[
                            "relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all",
                            isSelected
                              ? "border-blue-500 bg-white shadow-sm ring-4 ring-blue-100"
                              : "border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50/60",
                          ].join(" ")}
                        >
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-50 bg-blue-50">
                            {template.icon}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-black text-slate-900">
                                {template.name}
                              </p>

                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                                {template.lang}
                              </span>
                            </div>

                            <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">
                              {template.desc}
                            </p>
                          </div>

                          {isSelected && (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                              <VscCheck size={12} />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <main className="p-5">
                {!selectedTemplate ? (
                  <div className="flex min-h-[430px] items-center justify-center rounded-2xl border border-dashed border-blue-100 bg-blue-50/40">
                    <div className="max-w-sm text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                        <Code2 size={24} />
                      </div>

                      <h3 className="text-base font-black text-slate-900">
                        템플릿을 선택해주세요
                      </h3>

                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                        왼쪽 목록에서 템플릿을 선택하면 설명, 파일 구조,
                        실행 명령어가 표시됩니다.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
                          {selectedTemplate.icon}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-black tracking-tight text-slate-950">
                              {selectedTemplate.name}
                            </h2>

                            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                              {selectedTemplate.lang}
                            </span>

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                              {selectedTemplate.type}
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                            {selectedTemplate.detail}
                          </p>
                        </div>
                      </div>
                    </section>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.85fr]">
                      <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                        <SectionTitle
                          icon={Code2}
                          title="생성 파일 구조"
                          description="템플릿 적용 시 생성되는 기본 디렉터리입니다."
                        />

                        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-[12px] leading-5 text-slate-200">
                          <div className="mb-1 font-semibold text-blue-300">
                            ▾ work-folder
                          </div>
                          {renderFileTree(selectedTemplate.structure)}
                        </div>
                      </section>

                      <div className="space-y-4">
                        <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                          <SectionTitle
                            icon={Cpu}
                            title="기술 스택"
                            description="초기 작업 폴더에 포함되는 주요 기술입니다."
                          />

                          <div className="mt-3 flex flex-wrap gap-2">
                            {selectedTemplate.stack.map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </section>

                        <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                          <SectionTitle
                            icon={PlayCircle}
                            title="실행 방법"
                            description="생성 후 터미널에서 사용할 명령어입니다."
                          />

                          <div className="mt-3 space-y-2">
                            {selectedTemplate.commands.map((command) => (
                              <div
                                key={command}
                                className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2.5 font-mono text-xs font-bold text-slate-700"
                              >
                                $ {command}
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                )}
              </main>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_0.95fr]">
              <main className="border-b border-blue-50 p-5 lg:border-b-0 lg:border-r">
                <section className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700">
                      {selectedTemplate?.lang}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600">
                      {selectedTemplate?.name}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600">
                      {selectedTemplate?.type}
                    </span>
                  </div>
                </section>

                <div className="space-y-4">
                  <label className="block">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-700">
                        작업 폴더 이름
                      </span>
                      <span className="text-[11px] font-black text-blue-600">
                        Required
                      </span>
                    </div>

                    <input
                      autoFocus
                      placeholder="예: backend-auth-server"
                      className="h-11 w-full rounded-2xl border border-blue-100 bg-blue-50/50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      value={formData.name}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          name: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="block">
                    <div className="mb-1.5 text-sm font-black text-slate-700">
                      작업 설명
                    </div>

                    <textarea
                      placeholder="이 작업 폴더에서 구현할 기능을 입력하세요."
                      className="min-h-[96px] w-full resize-none rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      value={formData.description}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          description: event.target.value,
                        })
                      }
                    />
                  </label>

                  <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-black tracking-tight text-slate-950">
                          GitHub 저장소 연결
                        </h2>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                          GitHub 계정은 사용자 단위, 저장소는 작업 폴더 단위로
                          연결합니다.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={loadGithubStatus}
                        disabled={githubLoading}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-blue-100 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-blue-50 disabled:opacity-50"
                      >
                        <RefreshCw
                          size={13}
                          className={githubLoading ? "animate-spin" : ""}
                        />
                        확인
                      </button>
                    </div>

                    <div
                      className={[
                        "mb-4 rounded-2xl border p-4",
                        isGithubConnected
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-amber-200 bg-amber-50",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            isGithubConnected
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700",
                          ].join(" ")}
                        >
                          {isGithubConnected ? (
                            <CheckCircle2 size={20} />
                          ) : (
                            <AlertCircle size={20} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-950">
                            {githubLoading
                              ? "GitHub 계정 연결 상태 확인 중"
                              : isGithubConnected
                                ? `GitHub 계정: ${githubName || "연결됨"}`
                                : "GitHub 계정 연결이 필요합니다"}
                          </p>

                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                            {isGithubConnected
                              ? "작업 폴더에 저장소 URL을 연결할 수 있습니다."
                              : "연결하지 않아도 작업 폴더 생성은 가능합니다."}
                          </p>

                          {githubError && (
                            <p className="mt-2 text-xs font-black text-amber-700">
                              {githubError}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {isGithubConnected ? (
                      <div className="grid grid-cols-1 gap-2">
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
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
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
                      </div>
                    )}

                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                      <label className="block">
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="text-sm font-black text-slate-700">
                            GitHub 저장소 URL
                          </span>

                          <span className="text-[11px] font-black text-slate-500">
                            선택 입력
                          </span>
                        </div>

                        <input
                          className={[
                            "h-11 w-full rounded-2xl px-4 font-mono text-sm font-bold outline-none transition",
                            !isGithubConnected
                              ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                              : isGitUrlInvalid
                                ? "border border-red-300 bg-red-50 text-red-700 focus:ring-4 focus:ring-red-50"
                                : "border border-blue-100 bg-white text-slate-800 focus:border-blue-400 focus:ring-4 focus:ring-blue-50",
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
                            setGitUrl(
                              normalizeGitHubRepoUrl(event.target.value),
                            )
                          }
                        />
                      </label>

                      {isGitUrlInvalid ? (
                        <p className="mt-2 text-xs font-bold text-red-600">
                          GitHub 저장소 주소는
                          https://github.com/username/repository.git
                          형식이어야 합니다.
                        </p>
                      ) : isGithubConnected ? (
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          SSH 주소를 입력하면 가능한 경우 HTTPS 주소로 자동
                          변환합니다.
                        </p>
                      ) : (
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                          GitHub 계정을 먼저 연결하면 저장소 URL을 입력할 수
                          있습니다.
                        </p>
                      )}
                    </div>
                  </section>
                </div>
              </main>

              <aside className="p-5">
                <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50">
                      {selectedTemplate?.icon}
                    </div>

                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-blue-500">
                        Selected Template
                      </p>

                      <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                        {selectedTemplate?.name}
                      </h2>

                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                        {selectedTemplate?.detail}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <SectionTitle
                    icon={Code2}
                    title="생성 파일 구조"
                    description="생성될 작업 폴더의 기본 구조입니다."
                  />

                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-[12px] leading-5 text-slate-200">
                    <div className="mb-1 font-semibold text-blue-300">
                      ▾ {formData.name.trim() || "work-folder"}
                    </div>

                    {selectedTemplate
                      ? renderFileTree(selectedTemplate.structure)
                      : null}
                  </div>
                </section>

                <section className="mt-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <SectionTitle
                    icon={Github}
                    title="저장소 연결"
                    description={
                      gitConnectMode === "repo" && normalizedGitUrl
                        ? "GitHub 저장소 URL이 입력되었습니다."
                        : "저장소 없이 작업 폴더를 먼저 생성합니다."
                    }
                  />
                </section>
              </aside>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-blue-50 bg-slate-50/80 px-6 py-4">
          <div className="hidden items-center gap-2 text-xs font-bold text-slate-500 sm:flex">
            <CheckCircle2 size={15} className="text-blue-600" />
            현재 선택된 프로젝트 안에 작업 폴더가 생성됩니다.
          </div>

          <div className="ml-auto flex items-center gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <ArrowLeft size={16} />
                이전
              </button>
            )}

            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              취소
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!selectedTemplateId}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                다음 단계
                <Rocket size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isCreateDisabled}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isSubmitting ? "생성 중..." : "작업 폴더 만들기"}
                <FolderPlus size={16} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StepBadge({ step }) {
  return (
    <div className="hidden items-center gap-2 md:flex">
      {["템플릿 선택", "작업 폴더 설정"].map((label, index) => {
        const stepNumber = index + 1;
        const isActive = step === stepNumber;
        const isDone = step > stepNumber;

        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={[
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-black",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : isDone
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-400",
              ].join(" ")}
            >
              {isDone ? <CheckCircle2 size={13} /> : <span>{stepNumber}</span>}
              <span>{label}</span>
            </div>

            {index === 0 && (
              <div className="hidden h-px w-5 bg-slate-200 sm:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
        <Icon size={17} />
      </div>

      <div>
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">
          {description}
        </p>
      </div>
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
      className={[
        "relative flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all",
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
          : selected
            ? "border-blue-500 bg-blue-50 shadow-sm ring-4 ring-blue-100"
            : "border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50/60",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          selected ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700",
        ].join(" ")}
      >
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-slate-950">{title}</p>
          {badge && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-500">
              {badge}
            </span>
          )}
        </div>

        <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">
          {description}
        </p>
      </div>

      {selected && (
        <div className="absolute right-3 top-3 text-blue-600">
          <CheckCircle2 size={17} />
        </div>
      )}
    </button>
  );
}