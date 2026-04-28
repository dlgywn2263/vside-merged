"use client";

const API_BASE = "http://localhost:8080";
import { useState, useEffect } from "react";
import {
  Plus,
  Send,
  Save,
  CheckCircle2,
  XCircle,
  X,
  ChevronDown,
  Clock,
} from "lucide-react";

type HttpMethod = "GET" | "POST" | "PUT" | "DEL";

interface Param {
  key: string;
  value: string;
  desc: string;
  enabled: boolean;
}

export default function ApiTesterPage() {
  // --- 상태 관리 (기능 유지) ---
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("https://api.example.com/v1/users");
  const [activeTab, setActiveTab] = useState("Params");
  const [params, setParams] = useState<Param[]>([
    { key: "page", value: "1", desc: "Page number", enabled: true },
    { key: "limit", value: "10", desc: "Items per page", enabled: true },
  ]);
  const [headers, setHeaders] = useState<
    { key: string; value: string; enabled: boolean }[]
  >([{ key: "", value: "", enabled: true }]);

  const [authType, setAuthType] = useState<"none" | "bearer">("none");
  const [bearerToken, setBearerToken] = useState("");
  const [body, setBody] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedTests, setSavedTests] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // 데이터 로드
  useEffect(() => {
    const load = async () => {
      try {
        const [testsRes, histRes] = await Promise.all([
          fetch(`${API_BASE}/api/test`, { cache: "no-store" }),
          fetch(`${API_BASE}/api/history?limit=10`, { cache: "no-store" }),
        ]);

        // ✅ 서버 에러면 내용 텍스트로라도 로그 확인
        if (!testsRes.ok) {
          const t = await testsRes.text().catch(() => "");
          throw new Error(`GET /api/test failed: ${testsRes.status} ${t}`);
        }
        if (!histRes.ok) {
          const t = await histRes.text().catch(() => "");
          throw new Error(`GET /api/history failed: ${histRes.status} ${t}`);
        }

        const tests = await testsRes.json();
        const hist = await histRes.json();

        setSavedTests(
          (Array.isArray(tests) ? tests : []).map((t: any) => ({
            id: t.id,
            title: t.title,
            method: t.method,
            url: t.url,
            params: t.params ?? [],
            headers: t.headers ?? [],
            body: t.body ?? "",
          })),
        );
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

          // 7일 넘으면 날짜로
          return new Intl.DateTimeFormat("ko-KR", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(t));
        }
        setHistory(
          (hist ?? []).map((h: any) => ({
            id: h.id,
            method: h.method,
            url: h.url,
            success: !!h.success,
            time: h.createdAt ? formatTimeAgo(h.createdAt) : "—",
            rawTime: h.createdAt,
            status: h.status,
            durationMs: h.durationMs,
          })),
        );
      } catch (e) {
        console.error("initial load failed:", e);
        // 여기서는 UI를 죽이지 말고 조용히 유지
      }
    };

    load();
  }, []);

  // --- 핵심 기능 ---
  const API_BASE = "http://localhost:8080";

  const handleSend = async () => {
    setIsLoading(true);
    setResponse(null);

    const start = performance.now();

    try {
      // ✅ 1) 활성화된 Params로 querystring 만들기
      const activeParams = params.filter((p) => p.enabled && p.key);
      const query = activeParams.length
        ? "?" +
          new URLSearchParams(
            activeParams.reduce(
              (acc, p) => ({ ...acc, [p.key]: p.value }),
              {} as Record<string, string>,
            ),
          ).toString()
        : "";

      // ✅ 2) 실제 목적지 URL(쿼리 포함)
      const targetFullUrl = url + query;

      // ✅ 2.5) method normalize
      const normalizedMethod = method === "DEL" ? "DELETE" : method; // "GET" | "POST" | "PUT" | "DELETE" ...

      // ✅ 2.6) Headers 탭 입력 → 객체화
      const headersObj = headers
        .filter((h) => h.enabled && h.key?.trim())
        .reduce(
          (acc, h) => {
            acc[h.key.trim()] = h.value ?? "";
            return acc;
          },
          {} as Record<string, string>,
        );

      // ✅ 2.7) Auth 탭(Bearer) → Authorization 주입
      // (상태는 네가 만든 authType / bearerToken 기준)
      if (authType === "bearer" && bearerToken.trim()) {
        headersObj["Authorization"] = `Bearer ${bearerToken.trim()}`;
      }

      // ✅ (선택) JSON body를 보낼 때 Content-Type이 비어있으면 기본값 세팅
      // headersObj에 content-type이 이미 있으면 덮어쓰지 않음
      const hasContentType = Object.keys(headersObj).some(
        (k) => k.toLowerCase() === "content-type",
      );
      const willSendBody = !["GET", "HEAD"].includes(normalizedMethod);

      if (willSendBody && body && !hasContentType) {
        headersObj["Content-Type"] = "application/json";
      }

      // ✅ 3) 프록시로 POST 고정 (이건 OK)
      const res = await fetch(`${API_BASE}/api/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // 프록시에 보내는 요청의 타입
        body: JSON.stringify({
          url: targetFullUrl,
          method: normalizedMethod,
          headers: headersObj, // ✅ 여기에 최종 headers 넣기
          body: willSendBody ? body : null,
        }),
      });

      // ✅ 4) 응답 처리
      // 프록시가 JSON이 아닐 수도 있으면 try/catch로 보호하는 게 안전하지만
      // 지금 네 프록시는 json으로 내려주는 구조라면 그대로 둬도 됨.
      const data = await res.json();
      const time = Math.round(performance.now() - start);

      const normalizedStatus =
        typeof data?.status === "number" ? data.status : res.status;

      const normalizedPayload =
        data && typeof data === "object" && "data" in data ? data.data : data;

      setResponse({ status: normalizedStatus, data: normalizedPayload, time });

      // ✅ 5) 히스토리 서버 저장
      try {
        await fetch(`${API_BASE}/api/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: normalizedMethod,
            url: targetFullUrl,
            status: normalizedStatus,
            durationMs: time,
          }),
        });

        const histRes = await fetch(`${API_BASE}/api/history?limit=10`);
        const hist = await histRes.json();

        setHistory(
          (hist ?? []).map((h: any) => ({
            id: h.id,
            method: h.method,
            url: h.url,
            success: !!h.success,
            time: "방금 전",
            status: h.status,
            durationMs: h.durationMs,
          })),
        );
      } catch (e) {
        console.error("history save failed", e);
      }
    } catch (e) {
      setResponse({ status: "ERR", data: "연결 실패", time: 0 });
    } finally {
      setIsLoading(false);
    }
  };
  const handleSave = async () => {
    const title = prompt("저장할 테스트 이름을 입력하세요", "New API Test");
    if (!title) return;

    try {
      const res = await fetch(`${API_BASE}/api/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          method: method === "DEL" ? "DELETE" : method,
          url,
          params,
          headers,
          body,
        }),
      });

      // ✅ 서버 에러면 메시지 보기 좋게
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`save failed: ${res.status} ${t}`);
      }

      const saved = await res.json();

      // ✅ 서버 응답을 프론트 형태로 정규화
      const newItem = {
        id: saved.id,
        title: saved.title,
        method: saved.method,
        url: saved.url,
        params: saved.params ?? [],
        headers: saved.headers ?? [],
        body: saved.body ?? "",
      };

      // ✅ 즉시 UI 반영
      setSavedTests((prev) => [newItem, ...prev]);

      // ✅ (선택) DB 저장 확실히 확인하고 싶으면: 목록 재조회
      // const listRes = await fetch(`${API_BASE}/api/tests`);
      // const list = await listRes.json();
      // setSavedTests(
      //   (list ?? []).map((t: any) => ({
      //     id: t.id,
      //     title: t.title,
      //     method: t.method,
      //     url: t.url,
      //     params: t.params ?? [],
      //     headers: t.headers ?? [],
      //     body: t.body ?? "",
      //   })),
      // );
    } catch (e) {
      alert("저장 실패: 백엔드가 실행 중인지 확인하세요");
      console.error(e);
    }
  };

  return (
    <div className="flex flex-1 h-full bg-white overflow-hidden font-sans">
      {/* [왼쪽 패널] API테스터 (1).png 디자인 */}
      <div className="w-64 border-r border-slate-200 flex flex-col bg-slate-50/20">
        <div className="p-4 flex justify-between items-center border-b border-slate-100 bg-white">
          <span className="font-bold text-sm text-slate-700">API 테스트</span>
          <button className="p-1 border border-slate-200 rounded-md hover:bg-slate-50">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 p-2 space-y-1">
          {savedTests.map((test) => (
            <div
              key={test.id}
              onClick={() => {
                setMethod(test.method);
                setUrl(test.url);
                setParams(test.params);
              }}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 rounded-lg cursor-pointer group"
            >
              <span
                className={`text-[10px] font-bold border px-1.5 py-0.5 rounded min-w-[38px] text-center ${
                  test.method === "GET"
                    ? "border-green-500 text-green-600"
                    : "border-blue-500 text-blue-600"
                }`}
              >
                {test.method}
              </span>
              <span className="text-[13px] font-medium text-slate-600 truncate">
                {test.title}
              </span>
            </div>
          ))}

          <div className="mt-8 px-2">
            <h3 className="text-[11px] font-bold text-slate-400 mb-4 uppercase tracking-wider">
              테스트 히스토리
            </h3>
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between text-xs py-2 group"
              >
                <span className="text-slate-500">{h.time}</span>
                {h.success ? (
                  <CheckCircle2 className="text-green-500 w-3.5 h-3.5" />
                ) : (
                  <XCircle className="text-red-500 w-3.5 h-3.5" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* [중앙 패널] API테스터 (1).png 디자인 전면 적용 */}
      <div className="flex-1 overflow-y-auto bg-white flex flex-col">
        <div className="max-w-4xl w-full mx-auto px-8 py-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-1">
                Mini API Tester
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                API 엔드포인트를 테스트하고 응답을 확인하세요
              </p>
            </div>
            <button
              onClick={handleSave}
              className="bg-[#2563EB] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm"
            >
              <Save size={14} /> Save Test
            </button>
          </div>

          {/* 리퀘스트 박스 (연한 그레이 스타일) */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-8">
            <div className="flex gap-2 mb-6">
              <div className="relative">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                  className="appearance-none bg-slate-100 border-none rounded-xl px-5 py-3 text-sm font-bold text-slate-700 pr-10 outline-none cursor-pointer"
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DEL</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-4 text-slate-400"
                />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 bg-slate-100 border-none rounded-xl px-5 py-3 text-sm font-medium outline-none text-slate-600"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="bg-[#2563EB] text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
              >
                <Send size={16} /> {isLoading ? "..." : "Send"}
              </button>
            </div>

            {/* 탭 스타일 (둥근 배경형) */}
            <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
              {["Params", "Body", "Headers", "Auth"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Params 테이블 (연한 그레이 인풋) */}
            {activeTab === "Params" && (
              <div className="space-y-3">
                {params.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={p.key}
                      onChange={(e) => {
                        const n = [...params];
                        n[i].key = e.target.value;
                        setParams(n);
                      }}
                      placeholder="page"
                      className="flex-1 bg-slate-50 border-none rounded-lg px-4 py-2.5 text-xs text-slate-600 outline-none"
                    />
                    <input
                      type="text"
                      value={p.value}
                      onChange={(e) => {
                        const n = [...params];
                        n[i].value = e.target.value;
                        setParams(n);
                      }}
                      placeholder="1"
                      className="flex-1 bg-slate-50 border-none rounded-lg px-4 py-2.5 text-xs text-slate-600 outline-none"
                    />
                    <input
                      type="text"
                      value={p.desc}
                      onChange={(e) => {
                        const n = [...params];
                        n[i].desc = e.target.value;
                        setParams(n);
                      }}
                      placeholder="Page number"
                      className="flex-1 bg-slate-50 border-none rounded-lg px-4 py-2.5 text-xs text-slate-400 outline-none"
                    />
                    <button
                      onClick={() =>
                        setParams(params.filter((_, idx) => idx !== i))
                      }
                      className="p-2 text-slate-300 hover:text-slate-900"
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
                  className="mt-2 text-xs font-bold text-slate-700 border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-slate-50"
                >
                  <Plus size={14} /> Add Parameter
                </button>
              </div>
            )}
            {activeTab === "Body" && (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full h-32 bg-slate-50 border-none rounded-xl p-4 text-xs font-mono outline-none"
                placeholder='{ "key": "value" }'
              />
            )}
            {activeTab === "Headers" && (
              <div className="space-y-2 mt-4">
                {headers.map((h, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      placeholder="Key"
                      value={h.key}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[index].key = e.target.value;
                        setHeaders(copy);
                      }}
                    />

                    <input
                      className="flex-1 border rounded px-2 py-1 text-sm"
                      placeholder="Value"
                      value={h.value}
                      onChange={(e) => {
                        const copy = [...headers];
                        copy[index].value = e.target.value;
                        setHeaders(copy);
                      }}
                    />

                    <button
                      onClick={() => {
                        const copy = headers.filter((_, i) => i !== index);
                        setHeaders(copy);
                      }}
                      className="text-red-500 text-sm"
                    >
                      ✕
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
                  className="text-blue-600 text-sm mt-2"
                >
                  + Add Header
                </button>
              </div>
            )}
            {activeTab === "Auth" && (
              <div className="space-y-4 mt-4">
                <select
                  value={authType}
                  onChange={(e) =>
                    setAuthType(e.target.value as "none" | "bearer")
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="none">No Auth</option>
                  <option value="bearer">Bearer Token</option>
                </select>

                {authType === "bearer" && (
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    placeholder="Enter Bearer Token"
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                  />
                )}
              </div>
            )}
          </div>

          {/* Response 영역 (화이트 배경 + 보더) */}
          <div className="mb-10">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Response</h2>
            <div className="w-full h-64 border border-slate-100 rounded-2xl flex items-center justify-center bg-white shadow-sm relative overflow-hidden">
              {response ? (
                <div className="absolute inset-0 p-6 overflow-auto">
                  <div className="flex gap-4 mb-3 text-[10px] font-bold uppercase tracking-wider">
                    <span
                      className={
                        response.status < 400
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      Status: {response.status}
                    </span>
                    <span className="text-slate-400">
                      Time: {response.time}ms
                    </span>
                  </div>
                  <pre className="text-xs font-mono text-slate-500 leading-relaxed">
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <span className="text-slate-400 text-sm font-medium">
                  Click 'Send' to see response...
                </span>
              )}
            </div>
          </div>

          {/* Recent Tests 섹션 */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-4">
              Recent Tests
            </h2>

            <div className="space-y-3">
              {history.map((h) => {
                const displayUrl = String(h.url ?? "")
                  .replace(/^https?:\/\//, "")
                  .replace(/\?.*$/, "");

                const methodColor =
                  h.method === "GET"
                    ? "bg-green-500 text-white"
                    : h.method === "POST"
                      ? "bg-blue-500 text-white"
                      : h.method === "PUT"
                        ? "bg-indigo-500 text-white"
                        : h.method === "DELETE" || h.method === "DEL"
                          ? "bg-red-500 text-white"
                          : "bg-slate-500 text-white";

                return (
                  <div
                    key={h.id}
                    className="
            w-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm
            flex items-center gap-4
            overflow-hidden
          "
                  >
                    {/* 왼쪽: Method + URL */}
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <span
                        className={`
                shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold
                ${methodColor}
              `}
                      >
                        {h.method}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className="
                  truncate text-[13px] font-medium text-slate-700
                "
                          title={h.url}
                        >
                          {displayUrl}
                        </p>

                        <p
                          className="
                  mt-1 truncate text-[11px] text-slate-400
                "
                          title={h.url}
                        >
                          {h.url}
                        </p>
                      </div>
                    </div>

                    {/* 오른쪽: 시간 + 성공 여부 */}
                    <div className="shrink-0 flex items-center gap-3 text-xs text-slate-400">
                      <span className="whitespace-nowrap font-medium">
                        {h.time}
                      </span>

                      {h.success ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : (
                        <XCircle size={16} className="text-red-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
