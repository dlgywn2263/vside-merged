"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Send,
  Save,
  CheckCircle2,
  XCircle,
  X,
  ChevronDown,
  Clock,
  Timer,
  Link2,
  Copy,
  Check,
  RefreshCw,
  FolderTree,
  Settings2,
  Trash2,
  Upload,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { apiFetch, apiJson } from "@/lib/api/apiClient";

type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

type BodyMode = "none" | "raw" | "form-data" | "x-www-form-urlencoded";
type RawType = "json" | "text" | "html" | "xml";
type AuthType = "none" | "bearer" | "basic" | "api-key";
type ResponseView = "pretty" | "raw";
type ResponseTab = "body" | "headers";
type AssertionType = "status" | "responseTime" | "jsonBody";
type AssertionOperator =
  | "equals"
  | "notEquals"
  | "lessThan"
  | "greaterThan"
  | "contains"
  | "exists";

interface Param {
  key: string;
  value: string;
  desc: string;
  enabled: boolean;
}

interface HeaderItem {
  key: string;
  value: string;
  enabled: boolean;
}

interface FormDataItem {
  id: string;
  key: string;
  value: string;
  type: "text" | "file";
  file: File | null;
  enabled: boolean;
}

interface UrlEncodedItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface ApiEnvironment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

interface AssertionItem {
  id: string;
  type: AssertionType;
  operator: AssertionOperator;
  path: string;
  expected: string;
  enabled: boolean;
}

interface SerializedFormDataItem {
  key: string;
  type: "text" | "file";
  value?: string;
  fileName?: string;
  contentType?: string;
  base64?: string;
}

interface SavedTestItem {
  id: string | number;
  title: string;
  method: HttpMethod;
  url: string;
  params: Param[];
  headers: HeaderItem[];
  body: string;
  bodyMode?: BodyMode;
  rawType?: RawType;
  urlEncoded?: UrlEncodedItem[];
  authType?: AuthType;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: "header" | "query";
  assertions?: AssertionItem[];
}

interface ResponseState {
  status: number | string;
  statusText: string;
  data: any;
  rawText: string;
  time: number;
  headers: Record<string, string>;
  size: number;
}

interface HistoryItem {
  id: string | number;
  method: string;
  url: string;
  success: boolean;
  time: string;
  rawTime?: string;
  status?: number | string;
  statusText?: string;
  durationMs?: number;
  responseSize?: number;
  responseData?: any;
  responseHeaders?: Record<string, string>;
}

interface DiscoveredEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  projectName?: string;
  filePath?: string;
  controller?: string;
  handler?: string;
}

interface AssertionResult {
  id: string;
  passed: boolean;
  actual: string;
  message: string;
}

const STORAGE_ENVIRONMENTS = "waivs-api-tester-environments";
const STORAGE_SELECTED_ENVIRONMENT = "waivs-api-tester-selected-environment";

function createId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_ENVIRONMENTS: ApiEnvironment[] = [
  {
    id: "local",
    name: "Local",
    variables: [
      {
        id: "local-base-url",
        key: "baseUrl",
        value: "http://localhost:8080",
        enabled: true,
      },
    ],
  },
  {
    id: "team",
    name: "Team Server",
    variables: [
      {
        id: "team-base-url",
        key: "baseUrl",
        value: "",
        enabled: true,
      },
    ],
  },
  {
    id: "production",
    name: "Production",
    variables: [
      {
        id: "production-base-url",
        key: "baseUrl",
        value: "",
        enabled: true,
      },
    ],
  },
];

function toUiMethod(method: string): HttpMethod {
  const normalized = String(method ?? "GET").toUpperCase();

  if (
    normalized === "GET" ||
    normalized === "POST" ||
    normalized === "PUT" ||
    normalized === "PATCH" ||
    normalized === "DELETE" ||
    normalized === "HEAD" ||
    normalized === "OPTIONS"
  ) {
    return normalized;
  }

  if (normalized === "DEL") return "DELETE";
  return "GET";
}

function formatTimeAgo(input: string | number | Date) {
  const t = new Date(input).getTime();
  if (Number.isNaN(t)) return "";

  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 10) return "방금 전";
  if (sec < 60) return `${sec}초 전`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(t));
}

function formatDateTime(input?: string | number | Date) {
  if (!input) return "—";

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getMethodBadgeClass(method: string) {
  switch (toUiMethod(method)) {
    case "GET":
      return "border-emerald-500 text-emerald-600 bg-emerald-50";
    case "POST":
      return "border-blue-500 text-blue-600 bg-blue-50";
    case "PUT":
      return "border-indigo-500 text-indigo-600 bg-indigo-50";
    case "PATCH":
      return "border-violet-500 text-violet-600 bg-violet-50";
    case "DELETE":
      return "border-red-500 text-red-600 bg-red-50";
    case "HEAD":
      return "border-amber-500 text-amber-600 bg-amber-50";
    case "OPTIONS":
      return "border-slate-500 text-slate-600 bg-slate-50";
    default:
      return "border-slate-400 text-slate-600 bg-slate-50";
  }
}

function getStatusClass(status?: number | string) {
  if (status === undefined || status === null) {
    return "bg-slate-100 text-slate-500";
  }

  if (status === "ERR") {
    return "bg-red-50 text-red-600";
  }

  const numericStatus = Number(status);

  if (Number.isNaN(numericStatus)) {
    return "bg-slate-100 text-slate-500";
  }

  if (numericStatus >= 200 && numericStatus < 300) {
    return "bg-emerald-50 text-emerald-600";
  }

  if (numericStatus >= 300 && numericStatus < 400) {
    return "bg-blue-50 text-blue-600";
  }

  if (numericStatus >= 400) {
    return "bg-red-50 text-red-600";
  }

  return "bg-slate-100 text-slate-500";
}

function shortUrl(url: string) {
  return String(url ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\?.*$/, "");
}

function getPreviewText(data: any) {
  if (data === undefined || data === null) {
    return "응답 본문이 저장되어 있지 않습니다.";
  }

  if (typeof data === "string") {
    return data.length > 120 ? `${data.slice(0, 120)}...` : data;
  }

  try {
    const json = JSON.stringify(data);
    return json.length > 120 ? `${json.slice(0, 120)}...` : json;
  } catch {
    return "응답 미리보기를 표시할 수 없습니다.";
  }
}

function normalizeHeaderObject(input: any): Record<string, string> {
  if (!input) return {};

  if (Array.isArray(input)) {
    return input.reduce(
      (acc, item) => {
        if (Array.isArray(item) && item.length >= 2) {
          acc[String(item[0])] = String(item[1]);
        } else if (item?.key) {
          acc[String(item.key)] = String(item.value ?? "");
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  if (typeof input === "object") {
    return Object.entries(input).reduce(
      (acc, [key, value]) => {
        acc[key] = Array.isArray(value)
          ? value.join(", ")
          : String(value ?? "");
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  return {};
}

function normalizeHistoryItem(h: any): HistoryItem {
  const status = h.status;

  let responseData: any = undefined;

  if (h.responseBody) {
    try {
      responseData = JSON.parse(h.responseBody);
    } catch {
      responseData = h.responseBody;
    }
  } else {
    responseData =
      h.responseData ?? h.response ?? h.data ?? h.result ?? undefined;
  }

  const numericStatus = Number(status);
  const success =
    typeof h.success === "boolean"
      ? h.success
      : !Number.isNaN(numericStatus)
        ? numericStatus >= 200 && numericStatus < 400
        : false;

  return {
    id: h.id ?? `${h.method}-${h.url}-${h.createdAt ?? Math.random()}`,
    method: h.method ?? "GET",
    url: h.url ?? "",
    success,
    time: h.createdAt ? formatTimeAgo(h.createdAt) : "—",
    rawTime: h.createdAt,
    status,
    statusText: h.statusText ?? "",
    durationMs: h.durationMs,
    responseSize: h.responseSize ?? h.size ?? undefined,
    responseData,
    responseHeaders: normalizeHeaderObject(
      h.responseHeaders ?? h.headers ?? undefined,
    ),
  };
}

function getEnvironmentMap(environment?: ApiEnvironment) {
  return (environment?.variables ?? [])
    .filter((item) => item.enabled && item.key.trim())
    .reduce(
      (acc, item) => {
        acc[item.key.trim()] = item.value;
        return acc;
      },
      {} as Record<string, string>,
    );
}

function resolveVariables(value: string, environment?: ApiEnvironment) {
  if (!value) return value;
  const map = getEnvironmentMap(environment);

  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, key) => {
    const resolved = map[String(key).trim()];
    return resolved !== undefined && resolved !== "" ? resolved : match;
  });
}

function hasUnresolvedVariables(value: string) {
  return /\{\{\s*[^}]+?\s*\}\}/.test(value);
}

function addQueryParamsToUrl(
  rawUrl: string,
  params: Array<{ key: string; value: string }>,
) {
  if (!params.length) return rawUrl;

  const query = new URLSearchParams();
  params.forEach((param) => query.append(param.key, param.value));
  const queryString = query.toString();

  if (!queryString) return rawUrl;
  return `${rawUrl}${rawUrl.includes("?") ? "&" : "?"}${queryString}`;
}

function bodyContentType(rawType: RawType) {
  switch (rawType) {
    case "json":
      return "application/json";
    case "html":
      return "text/html";
    case "xml":
      return "application/xml";
    default:
      return "text/plain";
  }
}

function stringifyPretty(data: any) {
  if (typeof data === "string") {
    try {
      return JSON.stringify(JSON.parse(data), null, 2);
    } catch {
      return data;
    }
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data ?? "");
  }
}

function getValueByPath(data: any, path: string) {
  if (!path.trim()) return data;

  const normalized = path
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/^\./, "")
    .split(".")
    .filter(Boolean);

  let current = data;

  for (const key of normalized) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }

  return current;
}

function parseExpectedValue(value: string) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function compareValues(actual: any, expected: any) {
  if (typeof actual === "object" || typeof expected === "object") {
    try {
      return JSON.stringify(actual) === JSON.stringify(expected);
    } catch {
      return actual === expected;
    }
  }

  return String(actual) === String(expected);
}

function evaluateAssertions(
  assertions: AssertionItem[],
  response: ResponseState | null,
): AssertionResult[] {
  if (!response) return [];

  return assertions
    .filter((assertion) => assertion.enabled)
    .map((assertion) => {
      let actualValue: any;

      if (assertion.type === "status") {
        actualValue = response.status;
      } else if (assertion.type === "responseTime") {
        actualValue = response.time;
      } else {
        actualValue = getValueByPath(response.data, assertion.path);
      }

      const expectedValue = parseExpectedValue(assertion.expected);
      let passed = false;

      switch (assertion.operator) {
        case "equals":
          passed = compareValues(actualValue, expectedValue);
          break;
        case "notEquals":
          passed = !compareValues(actualValue, expectedValue);
          break;
        case "lessThan":
          passed = Number(actualValue) < Number(expectedValue);
          break;
        case "greaterThan":
          passed = Number(actualValue) > Number(expectedValue);
          break;
        case "contains":
          passed = String(actualValue ?? "").includes(String(expectedValue));
          break;
        case "exists":
          passed = actualValue !== undefined && actualValue !== null;
          break;
      }

      const actualText =
        typeof actualValue === "object"
          ? JSON.stringify(actualValue)
          : String(actualValue ?? "undefined");

      return {
        id: assertion.id,
        passed,
        actual: actualText,
        message: passed ? "검증 통과" : `실제 값: ${actualText}`,
      };
    });
}

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function readProxyResponse(response: Response) {
  const text = await response.text().catch(() => "");
  let parsed: any = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  const envelope =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;

  const status =
    envelope && typeof envelope.status !== "undefined"
      ? envelope.status
      : response.status;

  const statusText =
    envelope && typeof envelope.statusText === "string"
      ? envelope.statusText
      : response.statusText;

  const data = envelope && "data" in envelope ? envelope.data : parsed;
  const headers = normalizeHeaderObject(
    envelope?.headers ?? Object.fromEntries(response.headers.entries()),
  );
  const rawText =
    typeof data === "string"
      ? data
      : data === null || data === undefined
        ? ""
        : JSON.stringify(data);

  const size = Number(envelope?.size) || new Blob([rawText]).size;

  return {
    status,
    statusText,
    data,
    rawText,
    headers,
    size,
  };
}

function defaultOperatorFor(type: AssertionType): AssertionOperator {
  if (type === "responseTime") return "lessThan";
  return "equals";
}

function assertionLabel(assertion: AssertionItem) {
  if (assertion.type === "status") return "Status";
  if (assertion.type === "responseTime") return "Response time";
  return assertion.path ? `JSON ${assertion.path}` : "JSON body";
}

export default function ApiTesterPage() {
  const pathname = usePathname();

  const workspaceId = useMemo(() => {
    if (!pathname) return "";

    const match = pathname.match(
      /^\/ide\/(?:personal|team)\/([^/?#]+)/,
    );

    return match?.[1] ? decodeURIComponent(match[1]) : "";
  }, [pathname]);

  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("{{baseUrl}}/api/history");
  const [activeTab, setActiveTab] = useState("Params");

  const [params, setParams] = useState<Param[]>([]);

  const [headers, setHeaders] = useState<HeaderItem[]>([
    { key: "", value: "", enabled: true },
  ]);

  const [bodyMode, setBodyMode] = useState<BodyMode>("none");
  const [rawType, setRawType] = useState<RawType>("json");
  const [body, setBody] = useState("");
  const [formDataItems, setFormDataItems] = useState<FormDataItem[]>([
    {
      id: createId("form"),
      key: "",
      value: "",
      type: "text",
      file: null,
      enabled: true,
    },
  ]);
  const [urlEncodedItems, setUrlEncodedItems] = useState<UrlEncodedItem[]>([
    {
      id: createId("encoded"),
      key: "",
      value: "",
      enabled: true,
    },
  ]);

  const [authType, setAuthType] = useState<AuthType>("none");
  const [bearerToken, setBearerToken] = useState("");
  const [basicUsername, setBasicUsername] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [apiKeyName, setApiKeyName] = useState("X-API-Key");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [apiKeyLocation, setApiKeyLocation] = useState<"header" | "query">(
    "header",
  );

  const [assertions, setAssertions] = useState<AssertionItem[]>([
    {
      id: createId("assertion"),
      type: "status",
      operator: "equals",
      path: "",
      expected: "200",
      enabled: true,
    },
  ]);

  const [environments, setEnvironments] = useState<ApiEnvironment[]>(
    DEFAULT_ENVIRONMENTS,
  );
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState("local");
  const [showEnvironmentEditor, setShowEnvironmentEditor] = useState(false);

  const [response, setResponse] = useState<ResponseState | null>(null);
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [responseView, setResponseView] = useState<ResponseView>("pretty");
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [savedTests, setSavedTests] = useState<SavedTestItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<
    string | number | null
  >(null);

  const [discoveredEndpoints, setDiscoveredEndpoints] = useState<
    DiscoveredEndpoint[]
  >([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState("");

  const selectedEnvironment = useMemo(
    () =>
      environments.find((item) => item.id === selectedEnvironmentId) ??
      environments[0],
    [environments, selectedEnvironmentId],
  );

  const selectedHistory = useMemo(
    () => history.find((item) => item.id === selectedHistoryId) ?? null,
    [history, selectedHistoryId],
  );

  const assertionResults = useMemo(
    () => evaluateAssertions(assertions, response),
    [assertions, response],
  );

  const assertionSummary = useMemo(() => {
    const total = assertionResults.length;
    const passed = assertionResults.filter((item) => item.passed).length;
    return { total, passed, failed: total - passed };
  }, [assertionResults]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ENVIRONMENTS);
      const selected = localStorage.getItem(STORAGE_SELECTED_ENVIRONMENT);

      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEnvironments(parsed);
        }
      }

      if (selected) setSelectedEnvironmentId(selected);
    } catch (e) {
      console.error("environment load failed", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ENVIRONMENTS, JSON.stringify(environments));
      localStorage.setItem(
        STORAGE_SELECTED_ENVIRONMENT,
        selectedEnvironmentId,
      );
    } catch (e) {
      console.error("environment save failed", e);
    }
  }, [environments, selectedEnvironmentId]);

  useEffect(() => {
    const load = async () => {
      try {
        const [tests, hist] = await Promise.all([
          apiJson("/api/test", { cache: "no-store" }),
          apiJson("/api/history?limit=20", { cache: "no-store" }),
        ]);

        setSavedTests(
          (Array.isArray(tests) ? tests : []).map((t: any) => ({
            id: t.id,
            title: t.title,
            method: toUiMethod(t.method),
            url: t.url,
            params: t.params ?? [],
            headers: t.headers ?? [],
            body: t.body ?? "",
            bodyMode: t.bodyMode ?? "raw",
            rawType: t.rawType ?? "json",
            urlEncoded: t.urlEncoded ?? [],
            authType: t.authType ?? "none",
            bearerToken: t.bearerToken ?? "",
            basicUsername: t.basicUsername ?? "",
            basicPassword: t.basicPassword ?? "",
            apiKeyName: t.apiKeyName ?? "X-API-Key",
            apiKeyValue: t.apiKeyValue ?? "",
            apiKeyLocation: t.apiKeyLocation ?? "header",
            assertions: t.assertions ?? [],
          })),
        );

        setHistory((Array.isArray(hist) ? hist : []).map(normalizeHistoryItem));
      } catch (e) {
        console.error("initial load failed:", e);
      }
    };

    load();
  }, []);

  const updateSelectedEnvironment = (
    updater: (environment: ApiEnvironment) => ApiEnvironment,
  ) => {
    setEnvironments((prev) =>
      prev.map((environment) =>
        environment.id === selectedEnvironmentId
          ? updater(environment)
          : environment,
      ),
    );
  };

  const handleSelectSavedTest = (test: SavedTestItem) => {
    setMethod(toUiMethod(test.method));
    setUrl(test.url);
    setParams(test.params ?? []);
    setHeaders(test.headers ?? [{ key: "", value: "", enabled: true }]);
    setBody(test.body ?? "");
    setBodyMode(test.bodyMode ?? (test.body ? "raw" : "none"));
    setRawType(test.rawType ?? "json");
    setUrlEncodedItems(
      test.urlEncoded?.length
        ? test.urlEncoded
        : [
            {
              id: createId("encoded"),
              key: "",
              value: "",
              enabled: true,
            },
          ],
    );
    setAuthType(test.authType ?? "none");
    setBearerToken(test.bearerToken ?? "");
    setBasicUsername(test.basicUsername ?? "");
    setBasicPassword(test.basicPassword ?? "");
    setApiKeyName(test.apiKeyName ?? "X-API-Key");
    setApiKeyValue(test.apiKeyValue ?? "");
    setApiKeyLocation(test.apiKeyLocation ?? "header");
    setAssertions(
      test.assertions?.length
        ? test.assertions
        : [
            {
              id: createId("assertion"),
              type: "status",
              operator: "equals",
              path: "",
              expected: "200",
              enabled: true,
            },
          ],
    );
  };

  const handleSelectHistory = (item: HistoryItem) => {
    setSelectedHistoryId(item.id);
    setMethod(toUiMethod(item.method));
    setUrl(item.url);

    const rawText =
      typeof item.responseData === "string"
        ? item.responseData
        : item.responseData === undefined
          ? ""
          : JSON.stringify(item.responseData);

    setResponse({
      status: item.status ?? "—",
      statusText: item.statusText ?? "",
      time: item.durationMs ?? 0,
      data:
        item.responseData ??
        "이 히스토리에는 응답 본문이 저장되어 있지 않습니다. 현재 백엔드 history 저장값에 response body가 없다면 status, url, duration만 확인할 수 있습니다.",
      rawText,
      headers: item.responseHeaders ?? {},
      size: item.responseSize ?? new Blob([rawText]).size,
    });
  };

  const handleDiscoverEndpoints = async () => {
    // workspace 변경/재탐색 시 이전 목록이 남지 않도록 먼저 제거
    setDiscoveredEndpoints([]);
    setIsDiscovering(true);
    setDiscoverError("");

    try {
      if (!workspaceId) {
        setDiscoverError("현재 워크스페이스 정보를 찾을 수 없습니다.");
        return;
      }

      const data = await apiJson(
        `/api/api-tester/workspaces/${encodeURIComponent(
          workspaceId,
        )}/endpoints?branchName=master`,
        { cache: "no-store" },
      );

      const rawList = Array.isArray(data) ? data : [];

      const mapped = rawList
        .map((item: any) => ({
          id:
            item.id ??
            `${item.projectName ?? ""}-${item.method ?? "GET"}-${item.path ?? createId()}`,
          method: toUiMethod(item.method ?? "GET"),
          path: item.path ?? "",
          projectName: item.projectName,
          filePath: item.filePath,
          controller: item.controller,
          handler: item.handler,
        }))
        .filter((item: DiscoveredEndpoint) => item.path);

      setDiscoveredEndpoints(mapped);

      if (mapped.length === 0) {
        setDiscoverError(
          "현재 작업 폴더에서 API Controller를 찾지 못했습니다.",
        );
      }
    } catch (e) {
      console.error("workspace endpoint discovery failed", e);
      setDiscoveredEndpoints([]);
      setDiscoverError(
        "현재 작업 폴더의 API를 불러오지 못했습니다.",
      );
    } finally {
      setIsDiscovering(false);
    }
  };

  useEffect(() => {
    setDiscoveredEndpoints([]);

    if (!workspaceId) {
      setDiscoverError("현재 워크스페이스 정보를 찾을 수 없습니다.");
      return;
    }

    handleDiscoverEndpoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);


  const handleSelectDiscoveredEndpoint = (endpoint: DiscoveredEndpoint) => {
    setMethod(endpoint.method);
    setUrl(
      endpoint.path.startsWith("http")
        ? endpoint.path
        : `{{baseUrl}}${endpoint.path.startsWith("/") ? "" : "/"}${endpoint.path}`,
    );
    setSelectedHistoryId(null);
    setResponse(null);

    if (["GET", "HEAD", "OPTIONS"].includes(endpoint.method)) {
      setBodyMode("none");
    }
  };

  const buildSerializedFormData = async () => {
    const items = formDataItems.filter((item) => item.enabled && item.key.trim());
    const serialized: SerializedFormDataItem[] = [];

    for (const item of items) {
      if (item.type === "file") {
        if (!item.file) continue;
        serialized.push({
          key: resolveVariables(item.key, selectedEnvironment),
          type: "file",
          fileName: item.file.name,
          contentType: item.file.type || "application/octet-stream",
          base64: await fileToBase64(item.file),
        });
      } else {
        serialized.push({
          key: resolveVariables(item.key, selectedEnvironment),
          type: "text",
          value: resolveVariables(item.value, selectedEnvironment),
        });
      }
    }

    return serialized;
  };

  const handleSend = async () => {
    setIsLoading(true);
    setResponse(null);
    setSelectedHistoryId(null);
    setCopied(false);

    const start = performance.now();

    try {
      const resolvedBaseUrl = resolveVariables(url.trim(), selectedEnvironment);

      if (!resolvedBaseUrl) {
        throw new Error("URL을 입력하세요.");
      }

      if (hasUnresolvedVariables(resolvedBaseUrl)) {
        throw new Error(
          `환경변수 값이 비어 있습니다: ${resolvedBaseUrl.match(/\{\{[^}]+\}\}/)?.[0] ?? "확인 필요"}`,
        );
      }

      const activeParams = params
        .filter((p) => p.enabled && p.key.trim())
        .map((p) => ({
          key: resolveVariables(p.key.trim(), selectedEnvironment),
          value: resolveVariables(p.value, selectedEnvironment),
        }));

      let targetFullUrl = addQueryParamsToUrl(resolvedBaseUrl, activeParams);

      // /api/history 자체를 테스트할 때 그 응답을 다시 history에 저장하면
      // history 응답 안에 이전 history가 계속 중첩되므로 자동 저장 대상에서 제외한다.
      let isApiTesterHistoryEndpoint = false;

      try {
        const parsedTargetUrl = new URL(targetFullUrl);
        isApiTesterHistoryEndpoint =
          parsedTargetUrl.pathname === "/api/history";
      } catch {
        // URL 유효성은 proxy 호출 과정에서 다시 검증된다.
      }

      const headersObj = headers
        .filter((h) => h.enabled && h.key?.trim())
        .reduce(
          (acc, h) => {
            acc[resolveVariables(h.key.trim(), selectedEnvironment)] =
              resolveVariables(h.value ?? "", selectedEnvironment);
            return acc;
          },
          {} as Record<string, string>,
        );

      if (authType === "bearer" && bearerToken.trim()) {
        headersObj.Authorization = `Bearer ${resolveVariables(
          bearerToken.trim(),
          selectedEnvironment,
        )}`;
      }

      if (authType === "basic") {
        const username = resolveVariables(basicUsername, selectedEnvironment);
        const password = resolveVariables(basicPassword, selectedEnvironment);
        headersObj.Authorization = `Basic ${btoa(`${username}:${password}`)}`;
      }

      if (authType === "api-key" && apiKeyName.trim()) {
        const key = resolveVariables(apiKeyName.trim(), selectedEnvironment);
        const value = resolveVariables(apiKeyValue, selectedEnvironment);

        if (apiKeyLocation === "header") {
          headersObj[key] = value;
        } else {
          targetFullUrl = addQueryParamsToUrl(targetFullUrl, [{ key, value }]);
        }
      }

      const hasContentType = Object.keys(headersObj).some(
        (key) => key.toLowerCase() === "content-type",
      );

      const canSendBody = !["GET", "HEAD", "OPTIONS"].includes(method);
      let requestBody: string | null = null;
      let serializedFormData: SerializedFormDataItem[] | undefined;

      if (canSendBody && bodyMode === "raw") {
        requestBody = resolveVariables(body, selectedEnvironment);

        if (!requestBody.trim()) {
          throw new Error("요청 Body를 입력해주세요.");
        }

        if (rawType === "json") {
          try {
            JSON.parse(requestBody);
          } catch {
            throw new Error("JSON 형식이 올바르지 않습니다.");
          }
        }

        if (!hasContentType) {
          headersObj["Content-Type"] = bodyContentType(rawType);
        }
      }

      if (canSendBody && bodyMode === "x-www-form-urlencoded") {
        const encoded = new URLSearchParams();
        urlEncodedItems
          .filter((item) => item.enabled && item.key.trim())
          .forEach((item) => {
            encoded.append(
              resolveVariables(item.key.trim(), selectedEnvironment),
              resolveVariables(item.value, selectedEnvironment),
            );
          });
        requestBody = encoded.toString();

        if (!hasContentType) {
          headersObj["Content-Type"] = "application/x-www-form-urlencoded";
        }
      }

      if (canSendBody && bodyMode === "form-data") {
        serializedFormData = await buildSerializedFormData();

        Object.keys(headersObj).forEach((key) => {
          if (key.toLowerCase() === "content-type") delete headersObj[key];
        });
      }

      const res = await apiFetch("/api/proxy", {
        method: "POST",
        body: JSON.stringify({
          url: targetFullUrl,
          method,
          headers: headersObj,
          body: canSendBody && bodyMode !== "none" ? requestBody : null,
          bodyType: canSendBody ? bodyMode : "none",
          rawType,
          formData: serializedFormData,
        }),
      });

      const proxy = await readProxyResponse(res);
      const time = Math.round(performance.now() - start);

      const nextResponse: ResponseState = {
        status: proxy.status,
        statusText: proxy.statusText,
        data: proxy.data,
        rawText: proxy.rawText,
        time,
        headers: proxy.headers,
        size: proxy.size,
      };

      setResponse(nextResponse);
      setResponseTab("body");
      setResponseView("pretty");

      try {
        /*
         * /api/history GET도 "실행 기록"은 남겨야 한다.
         * 다만 응답 본문 자체가 이전 history 목록이므로 그대로 저장하면
         * history -> history -> history 형태로 본문이 계속 중첩된다.
         *
         * 따라서:
         * - GET /api/history: 실행 기록 저장 + responseBody만 짧은 안내문으로 저장
         * - POST /api/history: 대상 API 자체가 DB row를 생성하므로 자동 기록은 추가하지 않음
         * - 그 외 API: 기존처럼 응답 본문까지 정상 저장
         */
        const historyApiCreatesItsOwnRow =
          isApiTesterHistoryEndpoint && method === "POST";

        if (!historyApiCreatesItsOwnRow) {
          const historyResponseBody = isApiTesterHistoryEndpoint
            ? "[API Tester 히스토리 응답은 중첩 방지를 위해 본문 저장을 생략했습니다.]"
            : typeof proxy.data === "string"
              ? proxy.data
              : JSON.stringify(proxy.data);

          await apiJson("/api/history", {
            method: "POST",
            body: JSON.stringify({
              method,
              url: targetFullUrl,
              status: proxy.status,
              statusText: proxy.statusText,
              success:
                typeof proxy.status === "number"
                  ? proxy.status >= 200 && proxy.status < 400
                  : false,
              durationMs: time,
              responseSize: proxy.size,
              responseBody: historyResponseBody,
              responseHeaders: proxy.headers,
            }),
          });
        }

        const hist = await apiJson("/api/history?limit=20", {
          cache: "no-store",
        });

        const mappedHistory = (Array.isArray(hist) ? hist : []).map(
          normalizeHistoryItem,
        );

        // 화면도 DB에 실제 저장된 목록만 사용한다.
        // local fake item을 추가하지 않아 중복 표시를 막는다.
        setHistory(mappedHistory.slice(0, 20));
      } catch (e) {
        console.error("history refresh/save failed", e);

        // history 저장 자체가 실패했을 때만 임시 로컬 기록을 보여준다.
        if (!(isApiTesterHistoryEndpoint && method === "POST")) {
          const localItem: HistoryItem = {
            id: `local-${Date.now()}`,
            method,
            url: targetFullUrl,
            success:
              typeof proxy.status === "number"
                ? proxy.status >= 200 && proxy.status < 400
                : false,
            time: "방금 전",
            rawTime: new Date().toISOString(),
            status: proxy.status,
            statusText: proxy.statusText,
            durationMs: time,
            responseSize: proxy.size,
            responseData: isApiTesterHistoryEndpoint
              ? "히스토리 응답 본문 저장 생략"
              : proxy.data,
            responseHeaders: proxy.headers,
          };

          setHistory((prev) => [localItem, ...prev].slice(0, 20));
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "연결 실패";
      const time = Math.round(performance.now() - start);
      const errorResponse: ResponseState = {
        status: "ERR",
        statusText: "Request Failed",
        data: message,
        rawText: message,
        time,
        headers: {},
        size: new Blob([message]).size,
      };

      setResponse(errorResponse);

      const isClientValidationError =
        message === "URL을 입력하세요." ||
        message.startsWith("환경변수 값이 비어 있습니다:") ||
        message === "요청 Body를 입력해주세요." ||
        message === "JSON 형식이 올바르지 않습니다.";

      if (!isClientValidationError) {
        const localItem: HistoryItem = {
          id: `local-error-${Date.now()}`,
          method,
          url,
          success: false,
          time: "방금 전",
          rawTime: new Date().toISOString(),
          status: "ERR",
          durationMs: time,
          responseData: message,
        };

        setHistory((prev) => [localItem, ...prev].slice(0, 20));
      }

      console.error(e);
    } finally {
      setIsLoading(false);
    }
    
  
  };

  const handleSave = async () => {
    const title = prompt("저장할 테스트 이름을 입력하세요", "New API Test");
    if (!title) return;

    try {
      const saved = await apiJson("/api/test", {
        method: "POST",
        body: JSON.stringify({
          title,
          method,
          url,
          params,
          headers,
          body,
          bodyMode,
          rawType,
          urlEncoded: urlEncodedItems,
          authType,
          bearerToken,
          basicUsername,
          basicPassword,
          apiKeyName,
          apiKeyValue,
          apiKeyLocation,
          assertions,
        }),
      });

      const newItem: SavedTestItem = {
        id: saved.id,
        title: saved.title ?? title,
        method: toUiMethod(saved.method ?? method),
        url: saved.url ?? url,
        params: saved.params ?? params,
        headers: saved.headers ?? headers,
        body: saved.body ?? body,
        bodyMode: saved.bodyMode ?? bodyMode,
        rawType: saved.rawType ?? rawType,
        urlEncoded: saved.urlEncoded ?? urlEncodedItems,
        authType: saved.authType ?? authType,
        bearerToken: saved.bearerToken ?? bearerToken,
        basicUsername: saved.basicUsername ?? basicUsername,
        basicPassword: saved.basicPassword ?? basicPassword,
        apiKeyName: saved.apiKeyName ?? apiKeyName,
        apiKeyValue: saved.apiKeyValue ?? apiKeyValue,
        apiKeyLocation: saved.apiKeyLocation ?? apiKeyLocation,
        assertions: saved.assertions ?? assertions,
      };

      setSavedTests((prev) => [newItem, ...prev]);
    } catch (e) {
      alert("저장 실패: 백엔드가 실행 중인지 확인하세요");
      console.error(e);
    }
  };

  const handleDeleteSavedTest = async (
    testId: string | number,
    title: string,
  ) => {
    const ok = window.confirm(`"${title}" 저장 테스트를 삭제할까요?`);
    if (!ok) return;

    try {
      const res = await apiFetch(`/api/test/${testId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`삭제 실패 (${res.status})`);
      }

      setSavedTests((prev) => prev.filter((item) => item.id !== testId));
    } catch (e) {
      console.error("saved test delete failed", e);
      alert("저장 테스트 삭제에 실패했습니다.");
    }
  };

  const handleCopyResponse = async () => {
    if (!response) return;

    const text =
      responseView === "pretty"
        ? stringifyPretty(response.data)
        : response.rawText || stringifyPretty(response.data);

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch (e) {
      console.error("copy failed", e);
    }
  };

  const renderAssertionOperatorOptions = (type: AssertionType) => {
    if (type === "responseTime") {
      return (
        <>
          <option value="lessThan">less than</option>
          <option value="greaterThan">greater than</option>
          <option value="equals">equals</option>
        </>
      );
    }

    if (type === "jsonBody") {
      return (
        <>
          <option value="equals">equals</option>
          <option value="notEquals">not equals</option>
          <option value="contains">contains</option>
          <option value="exists">exists</option>
        </>
      );
    }

    return (
      <>
        <option value="equals">equals</option>
        <option value="notEquals">not equals</option>
      </>
    );
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-white font-sans">
      {/* 왼쪽 패널 */}
      <aside className="flex w-[380px] shrink-0 flex-col border-r border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800">API 테스트</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">
              프로젝트 API · 저장 테스트 · 실행 기록
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Controller 자동 탐색 */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree size={14} className="text-slate-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  프로젝트 API
                </h3>
              </div>

              <button
                onClick={handleDiscoverEndpoints}
                disabled={isDiscovering}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-white hover:text-blue-600 disabled:opacity-50"
                title="Controller API 다시 탐색"
              >
                <RefreshCw
                  size={14}
                  className={isDiscovering ? "animate-spin" : ""}
                />
              </button>
            </div>

            {discoveredEndpoints.length === 0 ? (
              <button
                onClick={handleDiscoverEndpoints}
                className="w-full rounded-xl border border-dashed border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-400 transition hover:border-blue-200 hover:text-blue-600"
              >
                {discoverError || "Controller에서 API 자동 탐색"}
              </button>
            ) : (
              <div className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
                {discoveredEndpoints.map((endpoint) => (
                  <button
                    key={endpoint.id}
                    onClick={() => handleSelectDiscoveredEndpoint(endpoint)}
                    className="w-full rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-blue-100 hover:bg-blue-50/30"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`min-w-[54px] rounded-md border px-2 py-0.5 text-center text-[9px] font-bold ${getMethodBadgeClass(
                          endpoint.method,
                        )}`}
                      >
                        {endpoint.method}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-700">
                        {endpoint.path}
                      </span>
                    </div>
                    {(endpoint.projectName ||
                      endpoint.controller ||
                      endpoint.handler) && (
                      <p
                        className="mt-1.5 truncate pl-[62px] text-[10px] text-slate-400"
                        title={endpoint.filePath}
                      >
                        {[
                          endpoint.projectName,
                          endpoint.controller,
                          endpoint.handler,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* 저장 테스트 */}
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                저장된 테스트
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {savedTests.length}
              </span>
            </div>

            <div className="space-y-2">
              {savedTests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-400">
                  저장된 테스트가 없습니다.
                </div>
              ) : (
                savedTests.map((test) => (
                  <div
                    key={test.id}
                    className="group flex items-stretch overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition hover:border-blue-100 hover:bg-blue-50/30"
                  >
                    <button
                      onClick={() => handleSelectSavedTest(test)}
                      className="min-w-0 flex-1 px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`min-w-[54px] rounded-md border px-2 py-0.5 text-center text-[9px] font-bold ${getMethodBadgeClass(
                            test.method,
                          )}`}
                        >
                          {test.method}
                        </span>

                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-700">
                          {test.title}
                        </span>
                      </div>

                      <p className="mt-2 truncate text-[11px] text-slate-400">
                        {test.url}
                      </p>
                    </button>

                    <button
                      onClick={() =>
                        handleDeleteSavedTest(test.id, test.title)
                      }
                      className="flex w-11 shrink-0 items-center justify-center border-l border-slate-100 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                      title="저장 테스트 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* 히스토리 */}
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                테스트 히스토리
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {history.length}
              </span>
            </div>

            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-xs text-slate-400">
                  아직 실행한 테스트가 없습니다.
                </div>
              ) : (
                history.map((h) => {
                  const isSelected = selectedHistoryId === h.id;

                  return (
                    <button
                      key={h.id}
                      onClick={() => handleSelectHistory(h)}
                      className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition ${
                        isSelected
                          ? "border-blue-300 ring-2 ring-blue-100"
                          : "border-slate-100 hover:border-blue-100 hover:bg-blue-50/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[9px] font-bold ${getMethodBadgeClass(
                                h.method,
                              )}`}
                            >
                              {toUiMethod(h.method)}
                            </span>

                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${getStatusClass(
                                h.status,
                              )}`}
                            >
                              {h.status ?? "—"}
                            </span>
                          </div>

                          <p
                            className="truncate text-[13px] font-bold text-slate-700"
                            title={h.url}
                          >
                            {shortUrl(h.url)}
                          </p>

                          <p
                            className="mt-1 truncate text-[11px] text-slate-400"
                            title={h.url}
                          >
                            {h.url}
                          </p>
                        </div>

                        {h.success ? (
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <XCircle className="mt-1 h-4 w-4 shrink-0 text-red-500" />
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2">
                          <Clock size={13} className="text-slate-400" />
                          <span className="truncate text-[11px] font-medium text-slate-500">
                            {h.time}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2">
                          <Timer size={13} className="text-slate-400" />
                          <span className="truncate text-[11px] font-medium text-slate-500">
                            {h.durationMs ?? 0}ms
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
                        <p className="line-clamp-2 break-all text-[11px] leading-5 text-slate-500">
                          {getPreviewText(h.responseData)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </aside>

      {/* 중앙 패널 */}
      <main className="flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-6xl p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="mb-1 text-xl font-bold text-slate-900">
                Mini API Tester
              </h1>
              <p className="text-xs font-medium text-slate-400">
                IDE에서 API 요청 · 응답 · 검증까지 한 번에 확인하세요
              </p>
            </div>

            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Save size={14} />
              Save Test
            </button>
          </div>

          {/* 환경변수 */}
          <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Environment
                </span>
                <div className="relative">
                  <select
                    value={selectedEnvironmentId}
                    onChange={(e) => setSelectedEnvironmentId(e.target.value)}
                    className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none"
                  >
                    {environments.map((environment) => (
                      <option key={environment.id} value={environment.id}>
                        {environment.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-3 top-2.5 text-slate-400"
                  />
                </div>

                <span className="hidden text-[11px] text-slate-400 lg:inline">
                  URL에서 {"{{baseUrl}}"} 형태로 사용할 수 있습니다.
                </span>
              </div>

              <button
                onClick={() => setShowEnvironmentEditor((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold transition ${
                  showEnvironmentEditor
                    ? "border-blue-200 bg-blue-50 text-blue-600"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Settings2 size={13} />
                Variables
              </button>
            </div>

            {showEnvironmentEditor && selectedEnvironment && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="space-y-2">
                  {selectedEnvironment.variables.map((variable) => (
                    <div key={variable.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={variable.enabled}
                        onChange={(e) =>
                          updateSelectedEnvironment((environment) => ({
                            ...environment,
                            variables: environment.variables.map((item) =>
                              item.id === variable.id
                                ? { ...item, enabled: e.target.checked }
                                : item,
                            ),
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />
                      <input
                        value={variable.key}
                        onChange={(e) =>
                          updateSelectedEnvironment((environment) => ({
                            ...environment,
                            variables: environment.variables.map((item) =>
                              item.id === variable.id
                                ? { ...item, key: e.target.value }
                                : item,
                            ),
                          }))
                        }
                        placeholder="Variable"
                        className="w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-blue-300"
                      />
                      <input
                        value={variable.value}
                        onChange={(e) =>
                          updateSelectedEnvironment((environment) => ({
                            ...environment,
                            variables: environment.variables.map((item) =>
                              item.id === variable.id
                                ? { ...item, value: e.target.value }
                                : item,
                            ),
                          }))
                        }
                        placeholder="Value"
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none focus:border-blue-300"
                      />
                      <button
                        onClick={() =>
                          updateSelectedEnvironment((environment) => ({
                            ...environment,
                            variables: environment.variables.filter(
                              (item) => item.id !== variable.id,
                            ),
                          }))
                        }
                        className="p-2 text-slate-300 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    updateSelectedEnvironment((environment) => ({
                      ...environment,
                      variables: [
                        ...environment.variables,
                        {
                          id: createId("env"),
                          key: "",
                          value: "",
                          enabled: true,
                        },
                      ],
                    }))
                  }
                  className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                >
                  <Plus size={13} />
                  Add Variable
                </button>
              </div>
            )}
          </div>

          {/* 요청 카드 */}
          <div className="mb-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex gap-2">
              <div className="relative shrink-0">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                  className="cursor-pointer appearance-none rounded-xl border-none bg-slate-100 px-5 py-3 pr-10 text-sm font-bold text-slate-700 outline-none"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                  <option value="HEAD">HEAD</option>
                  <option value="OPTIONS">OPTIONS</option>
                </select>

                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-4 text-slate-400"
                />
              </div>

              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) handleSend();
                }}
                className="flex-1 rounded-xl border-none bg-slate-100 px-5 py-3 text-sm font-medium text-slate-600 outline-none"
                placeholder="{{baseUrl}}/api/example"
              />

              <button
                onClick={handleSend}
                disabled={isLoading}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={16} />
                {isLoading ? "Sending..." : "Send"}
              </button>
            </div>

            <div className="mb-5 flex w-fit flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
              {["Params", "Body", "Headers", "Auth", "Tests"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                    activeTab === tab
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab}
                  {tab === "Tests" && assertions.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] text-slate-500">
                      {assertions.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Params */}
            {activeTab === "Params" && (
              <div className="space-y-3">
                {params.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) => {
                        const next = [...params];
                        next[i] = { ...next[i], enabled: e.target.checked };
                        setParams(next);
                      }}
                      className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                    />

                    <input
                      type="text"
                      value={p.key}
                      onChange={(e) => {
                        const next = [...params];
                        next[i] = { ...next[i], key: e.target.value };
                        setParams(next);
                      }}
                      placeholder="Key"
                      className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none"
                    />

                    <input
                      type="text"
                      value={p.value}
                      onChange={(e) => {
                        const next = [...params];
                        next[i] = { ...next[i], value: e.target.value };
                        setParams(next);
                      }}
                      placeholder="Value"
                      className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none"
                    />

                    <input
                      type="text"
                      value={p.desc}
                      onChange={(e) => {
                        const next = [...params];
                        next[i] = { ...next[i], desc: e.target.value };
                        setParams(next);
                      }}
                      placeholder="Description"
                      className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-400 outline-none"
                    />

                    <button
                      onClick={() =>
                        setParams(params.filter((_, idx) => idx !== i))
                      }
                      className="p-2 text-slate-300 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() =>
                    setParams([
                      ...params,
                      { key: "", value: "", desc: "", enabled: true },
                    ])
                  }
                  className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Plus size={14} />
                  Add Parameter
                </button>
              </div>
            )}

            {/* Body */}
            {activeTab === "Body" && (
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-5 border-b border-slate-100 pb-4">
                  {(
                    [
                      ["none", "none"],
                      ["raw", "raw"],
                      ["form-data", "form-data"],
                      ["x-www-form-urlencoded", "x-www-form-urlencoded"],
                    ] as Array<[BodyMode, string]>
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600"
                    >
                      <input
                        type="radio"
                        name="body-mode"
                        checked={bodyMode === value}
                        onChange={() => setBodyMode(value)}
                        className="accent-blue-600"
                      />
                      {label}
                    </label>
                  ))}
                </div>

                {bodyMode === "none" && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-xs text-slate-400">
                    이 요청에는 Body를 전송하지 않습니다.
                  </div>
                )}

                {bodyMode === "raw" && (
                  <div>
                    <div className="mb-3 flex items-center justify-end">
                      <div className="relative">
                        <select
                          value={rawType}
                          onChange={(e) => setRawType(e.target.value as RawType)}
                          className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-bold uppercase text-slate-600 outline-none"
                        >
                          <option value="json">JSON</option>
                          <option value="text">Text</option>
                          <option value="html">HTML</option>
                          <option value="xml">XML</option>
                        </select>
                        <ChevronDown
                          size={12}
                          className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400"
                        />
                      </div>
                    </div>

                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      className="h-44 w-full resize-y rounded-xl border-none bg-slate-50 p-4 font-mono text-xs leading-6 text-slate-600 outline-none"
                      placeholder={
                        rawType === "json"
                          ? '{\n  "key": "value"\n}'
                          : "Request body"
                      }
                    />
                  </div>
                )}

                {bodyMode === "form-data" && (
                  <div className="space-y-3">
                    {formDataItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(e) =>
                            setFormDataItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id
                                  ? { ...row, enabled: e.target.checked }
                                  : row,
                              ),
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                        />

                        <input
                          value={item.key}
                          onChange={(e) =>
                            setFormDataItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id
                                  ? { ...row, key: e.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder="Key"
                          className="w-[26%] rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none"
                        />

                        <select
                          value={item.type}
                          onChange={(e) =>
                            setFormDataItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id
                                  ? {
                                      ...row,
                                      type: e.target.value as "text" | "file",
                                      file: null,
                                    }
                                  : row,
                              ),
                            )
                          }
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 outline-none"
                        >
                          <option value="text">Text</option>
                          <option value="file">File</option>
                        </select>

                        {item.type === "text" ? (
                          <input
                            value={item.value}
                            onChange={(e) =>
                              setFormDataItems((prev) =>
                                prev.map((row) =>
                                  row.id === item.id
                                    ? { ...row, value: e.target.value }
                                    : row,
                                ),
                              )
                            }
                            placeholder="Value"
                            className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none"
                          />
                        ) : (
                          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
                            <Upload size={14} className="shrink-0 text-slate-400" />
                            <span className="truncate">
                              {item.file?.name ?? "Select file"}
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                setFormDataItems((prev) =>
                                  prev.map((row) =>
                                    row.id === item.id ? { ...row, file } : row,
                                  ),
                                );
                              }}
                            />
                          </label>
                        )}

                        <button
                          onClick={() =>
                            setFormDataItems((prev) =>
                              prev.filter((row) => row.id !== item.id),
                            )
                          }
                          className="p-2 text-slate-300 hover:text-red-500"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() =>
                        setFormDataItems((prev) => [
                          ...prev,
                          {
                            id: createId("form"),
                            key: "",
                            value: "",
                            type: "text",
                            file: null,
                            enabled: true,
                          },
                        ])
                      }
                      className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Plus size={14} />
                      Add Form Field
                    </button>
                  </div>
                )}

                {bodyMode === "x-www-form-urlencoded" && (
                  <div className="space-y-3">
                    {urlEncodedItems.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={(e) =>
                            setUrlEncodedItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id
                                  ? { ...row, enabled: e.target.checked }
                                  : row,
                              ),
                            )
                          }
                          className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                        />
                        <input
                          value={item.key}
                          onChange={(e) =>
                            setUrlEncodedItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id
                                  ? { ...row, key: e.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder="Key"
                          className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none"
                        />
                        <input
                          value={item.value}
                          onChange={(e) =>
                            setUrlEncodedItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id
                                  ? { ...row, value: e.target.value }
                                  : row,
                              ),
                            )
                          }
                          placeholder="Value"
                          className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none"
                        />
                        <button
                          onClick={() =>
                            setUrlEncodedItems((prev) =>
                              prev.filter((row) => row.id !== item.id),
                            )
                          }
                          className="p-2 text-slate-300 hover:text-red-500"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() =>
                        setUrlEncodedItems((prev) => [
                          ...prev,
                          {
                            id: createId("encoded"),
                            key: "",
                            value: "",
                            enabled: true,
                          },
                        ])
                      }
                      className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Plus size={14} />
                      Add Field
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Headers */}
            {activeTab === "Headers" && (
              <div className="space-y-3">
                {headers.map((h, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[index] = {
                          ...copy[index],
                          enabled: e.target.checked,
                        };
                        setHeaders(copy);
                      }}
                      className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                    />

                    <input
                      className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none"
                      placeholder="Key"
                      value={h.key}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[index] = { ...copy[index], key: e.target.value };
                        setHeaders(copy);
                      }}
                    />

                    <input
                      className="flex-1 rounded-lg border-none bg-slate-50 px-4 py-2.5 text-xs text-slate-600 outline-none"
                      placeholder="Value"
                      value={h.value}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[index] = {
                          ...copy[index],
                          value: e.target.value,
                        };
                        setHeaders(copy);
                      }}
                    />

                    <button
                      onClick={() =>
                        setHeaders(headers.filter((_, i) => i !== index))
                      }
                      className="p-2 text-slate-300 hover:text-red-500"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}

                <button
                  onClick={() =>
                    setHeaders([
                      ...headers,
                      { key: "", value: "", enabled: true },
                    ])
                  }
                  className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Plus size={14} />
                  Add Header
                </button>
              </div>
            )}

            {/* Auth */}
            {activeTab === "Auth" && (
              <div className="space-y-4">
                <div className="max-w-xs">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Type
                  </label>
                  <select
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value as AuthType)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none"
                  >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="api-key">API Key</option>
                  </select>
                </div>

                {authType === "none" && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-7 text-center text-xs text-slate-400">
                    인증 정보를 전송하지 않습니다.
                  </div>
                )}

                {authType === "bearer" && (
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-300"
                    placeholder="Bearer token 또는 {{accessToken}}"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                  />
                )}

                {authType === "basic" && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-300"
                      placeholder="Username"
                      value={basicUsername}
                      onChange={(e) => setBasicUsername(e.target.value)}
                    />
                    <input
                      type="password"
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-300"
                      placeholder="Password"
                      value={basicPassword}
                      onChange={(e) => setBasicPassword(e.target.value)}
                    />
                  </div>
                )}

                {authType === "api-key" && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_160px]">
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-300"
                      placeholder="Key"
                      value={apiKeyName}
                      onChange={(e) => setApiKeyName(e.target.value)}
                    />
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-blue-300"
                      placeholder="Value"
                      value={apiKeyValue}
                      onChange={(e) => setApiKeyValue(e.target.value)}
                    />
                    <select
                      value={apiKeyLocation}
                      onChange={(e) =>
                        setApiKeyLocation(e.target.value as "header" | "query")
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 outline-none"
                    >
                      <option value="header">Header</option>
                      <option value="query">Query Param</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Tests / Assertions */}
            {activeTab === "Tests" && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-700">
                      Response Assertions
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      상태 코드, 응답 시간, JSON 값을 자동으로 검증합니다.
                    </p>
                  </div>

                  {response && assertionSummary.total > 0 && (
                    <div className="flex items-center gap-2 text-[11px] font-bold">
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-600">
                        {assertionSummary.passed} Passed
                      </span>
                      <span className="rounded-md bg-red-50 px-2 py-1 text-red-600">
                        {assertionSummary.failed} Failed
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {assertions.map((assertion) => {
                    const result = assertionResults.find(
                      (item) => item.id === assertion.id,
                    );

                    return (
                      <div
                        key={assertion.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="checkbox"
                            checked={assertion.enabled}
                            onChange={(e) =>
                              setAssertions((prev) =>
                                prev.map((item) =>
                                  item.id === assertion.id
                                    ? { ...item, enabled: e.target.checked }
                                    : item,
                                ),
                              )
                            }
                            className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                          />

                          <select
                            value={assertion.type}
                            onChange={(e) => {
                              const type = e.target.value as AssertionType;
                              setAssertions((prev) =>
                                prev.map((item) =>
                                  item.id === assertion.id
                                    ? {
                                        ...item,
                                        type,
                                        operator: defaultOperatorFor(type),
                                        path: type === "jsonBody" ? item.path : "",
                                        expected:
                                          type === "status"
                                            ? "200"
                                            : type === "responseTime"
                                              ? "500"
                                              : item.expected,
                                      }
                                    : item,
                                ),
                              );
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none"
                          >
                            <option value="status">Status code</option>
                            <option value="responseTime">Response time</option>
                            <option value="jsonBody">JSON body</option>
                          </select>

                          {assertion.type === "jsonBody" && (
                            <input
                              value={assertion.path}
                              onChange={(e) =>
                                setAssertions((prev) =>
                                  prev.map((item) =>
                                    item.id === assertion.id
                                      ? { ...item, path: e.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="data.success"
                              className="min-w-[150px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none"
                            />
                          )}

                          <select
                            value={assertion.operator}
                            onChange={(e) =>
                              setAssertions((prev) =>
                                prev.map((item) =>
                                  item.id === assertion.id
                                    ? {
                                        ...item,
                                        operator: e.target
                                          .value as AssertionOperator,
                                      }
                                    : item,
                                ),
                              )
                            }
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none"
                          >
                            {renderAssertionOperatorOptions(assertion.type)}
                          </select>

                          {assertion.operator !== "exists" && (
                            <div className="relative min-w-[120px] flex-1">
                              <input
                                value={assertion.expected}
                                onChange={(e) =>
                                  setAssertions((prev) =>
                                    prev.map((item) =>
                                      item.id === assertion.id
                                        ? { ...item, expected: e.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                placeholder={
                                  assertion.type === "responseTime"
                                    ? "500"
                                    : "Expected value"
                                }
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none"
                              />
                              {assertion.type === "responseTime" && (
                                <span className="pointer-events-none absolute right-3 top-2 text-[10px] text-slate-400">
                                  ms
                                </span>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() =>
                              setAssertions((prev) =>
                                prev.filter((item) => item.id !== assertion.id),
                              )
                            }
                            className="p-2 text-slate-300 hover:text-red-500"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {response && assertion.enabled && result && (
                          <div
                            className={`mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold ${
                              result.passed
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {result.passed ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              <XCircle size={13} />
                            )}
                            <span>
                              {assertionLabel(assertion)} · {result.message}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    setAssertions((prev) => [
                      ...prev,
                      {
                        id: createId("assertion"),
                        type: "status",
                        operator: "equals",
                        path: "",
                        expected: "200",
                        enabled: true,
                      },
                    ])
                  }
                  className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Plus size={14} />
                  Add Assertion
                </button>
              </div>
            )}
          </div>

          {/* Response */}
          <section className="mb-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Response</h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  Body, Headers, 응답 시간과 테스트 검증 결과를 확인할 수 있습니다.
                </p>
              </div>

              {selectedHistory && (
                <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500">
                  <Link2 size={13} className="shrink-0" />
                  <span className="max-w-[340px] truncate">
                    {selectedHistory.url}
                  </span>
                </div>
              )}
            </div>

            <div className="relative min-h-[390px] w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              {response ? (
                <div className="flex min-h-[390px] flex-col">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
                        <span
                          className={`rounded-md px-2 py-1 ${getStatusClass(
                            response.status,
                          )}`}
                        >
                          {response.status}
                          {response.statusText ? ` ${response.statusText}` : ""}
                        </span>

                        <span className="rounded-md bg-slate-50 px-2 py-1 text-slate-500">
                          {response.time} ms
                        </span>

                        <span className="rounded-md bg-slate-50 px-2 py-1 text-slate-500">
                          {formatBytes(response.size)}
                        </span>

                        {assertionSummary.total > 0 && (
                          <span
                            className={`rounded-md px-2 py-1 ${
                              assertionSummary.failed === 0
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            Tests {assertionSummary.passed}/
                            {assertionSummary.total}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-slate-400">
                        {selectedHistory?.rawTime
                          ? formatDateTime(selectedHistory.rawTime)
                          : "Current response"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                        <button
                          onClick={() => setResponseTab("body")}
                          className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
                            responseTab === "body"
                              ? "bg-white text-slate-700 shadow-sm"
                              : "text-slate-400"
                          }`}
                        >
                          Body
                        </button>
                        <button
                          onClick={() => setResponseTab("headers")}
                          className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
                            responseTab === "headers"
                              ? "bg-white text-slate-700 shadow-sm"
                              : "text-slate-400"
                          }`}
                        >
                          Headers
                          <span className="ml-1.5 text-[9px] text-slate-400">
                            {Object.keys(response.headers).length}
                          </span>
                        </button>
                      </div>

                      {responseTab === "body" && (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                            <button
                              onClick={() => setResponseView("pretty")}
                              className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${
                                responseView === "pretty"
                                  ? "bg-white text-slate-700 shadow-sm"
                                  : "text-slate-400"
                              }`}
                            >
                              Pretty
                            </button>
                            <button
                              onClick={() => setResponseView("raw")}
                              className={`rounded-md px-3 py-1.5 text-[10px] font-bold ${
                                responseView === "raw"
                                  ? "bg-white text-slate-700 shadow-sm"
                                  : "text-slate-400"
                              }`}
                            >
                              Raw
                            </button>
                          </div>

                          <button
                            onClick={handleCopyResponse}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50"
                          >
                            {copied ? (
                              <Check size={13} className="text-emerald-500" />
                            ) : (
                              <Copy size={13} />
                            )}
                            {copied ? "Copied" : "Copy"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-h-[280px] flex-1 overflow-auto p-5">
                    {responseTab === "body" ? (
                      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-600">
                        {responseView === "pretty"
                          ? stringifyPretty(response.data)
                          : response.rawText || stringifyPretty(response.data)}
                      </pre>
                    ) : Object.keys(response.headers).length > 0 ? (
                      <div className="overflow-hidden rounded-xl border border-slate-100">
                        {Object.entries(response.headers).map(([key, value]) => (
                          <div
                            key={key}
                            className="grid grid-cols-[220px_1fr] border-b border-slate-100 last:border-b-0"
                          >
                            <div className="bg-slate-50 px-4 py-3 font-mono text-[11px] font-semibold text-slate-600">
                              {key}
                            </div>
                            <div className="break-all px-4 py-3 font-mono text-[11px] text-slate-500">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                        응답 헤더가 없습니다. 타깃 API의 Header를 보려면 proxy가
                        response headers를 함께 반환해야 합니다.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[390px] items-center justify-center text-sm font-medium text-slate-400">
                  Click 'Send' to see response...
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
