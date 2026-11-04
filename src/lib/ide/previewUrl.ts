// 경로: src/lib/ide/previewUrl.ts
//
// 미리보기 주소를 만드는 규칙.
//
// 실행한 앱은 백엔드 서버의 임시 포트(무작위)에 뜬다. 주소를 만드는 방식이 둘이다.
//
//   로컬·LAN 시연   http://{호스트}:{포트}                브라우저가 그 포트에 직접 붙는다
//   https 배포      {PREVIEW_BASE_URL}/{포트}/            서버의 Nginx 가 127.0.0.1:{포트} 로 넘겨 준다
//
// 배포에서 직접 붙지 못하는 이유: 프론트가 https 라서 http 미리보기는 브라우저가
// 막고(Mixed Content), 인증서는 443 에만 걸려 있어 임시 포트를 https 로 열 수도 없다.
//
// NEXT_PUBLIC_PREVIEW_BASE_URL 이 없으면 예전 방식 그대로다.
//
// 알려진 한계: 앱이 /css/style.css 처럼 맨 앞 "/" 로 시작하는 경로를 쓰면
// /preview/{포트}/ 아래에서는 찾지 못한다(React·Next 미리보기). Spring Boot 의 API 응답과
// Swing 화면 중계는 괜찮다.

/** 예: https://waivs.duckdns.org/preview — 끝의 "/" 는 떼어 "//" 가 생기지 않게 한다. */
export const PREVIEW_BASE_URL = (process.env.NEXT_PUBLIC_PREVIEW_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

/**
 * 서버를 거치는 미리보기 주소. 방식이 꺼져 있으면 null.
 *
 * @param pathAndQuery "/" 로 시작하는 나머지 경로. 기본값 "/" 덕분에 주소가 항상 "/" 로
 *   끝난다 — /preview/34567 은 서버가 /preview/34567/ 로 한 번 더 보낸다(301).
 */
export function buildProxiedPreviewUrl(
  port: string | number,
  pathAndQuery = "/",
): string | null {
  if (!PREVIEW_BASE_URL) return null;

  const rest = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  return `${PREVIEW_BASE_URL}/${port}${rest}`;
}

const PREVIEW_HOST = process.env.NEXT_PUBLIC_PREVIEW_HOST || "";
const PREVIEW_PROTOCOL = process.env.NEXT_PUBLIC_PREVIEW_PROTOCOL || "http";

const hasProtocol = (url: string) => /^https?:\/\//i.test(url);

/**
 * 실행 서버가 알려 준 주소(http://localhost:{포트})를 지금 브라우저가 실제로 열 수 있는 주소로 바꾼다.
 * https 배포는 서버를 거치는 주소로, 그 밖에는 호스트를 지금 접속한 호스트로 바꾼다.
 * localhost 는 백엔드 서버 안에서만 맞는 주소라 다른 PC 의 브라우저에서는 열리지 않는다.
 * WebPreview 와 API 테스터가 같은 규칙을 쓴다.
 */
export function toBrowserPreviewUrl(rawUrl: unknown): string {
  if (!rawUrl) return "";

  const trimmedUrl = String(rawUrl).trim();

  const withProtocol = hasProtocol(trimmedUrl)
    ? trimmedUrl
    : `${PREVIEW_PROTOCOL}://${trimmedUrl}`;

  try {
    const url = new URL(withProtocol);

    const isLocalPreviewHost =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";

    if (isLocalPreviewHost) {
      // https 배포에서는 임시 포트에 직접 붙지 못한다. 서버를 거치는 주소로 바꾼다.
      // 주소창에 localhost:포트 를 직접 쳤을 때도 여기를 지난다.
      const proxiedUrl = url.port
        ? buildProxiedPreviewUrl(url.port, `${url.pathname}${url.search}${url.hash}`)
        : null;

      if (proxiedUrl) return proxiedUrl;

      const replacementHost =
        PREVIEW_HOST || (typeof window === "undefined" ? "" : window.location.hostname);

      if (replacementHost) {
        url.protocol = `${PREVIEW_PROTOCOL}:`;
        url.hostname = replacementHost;
      }
    }

    return url.toString();
  } catch {
    return withProtocol;
  }
}

/**
 * 앱 화면(Swing 화면 중계, noVNC) 주소.
 *
 * 화면은 웹소켓으로 온다. noVNC 는 기본으로 "지금 호스트의 /websockify" 에 붙는데,
 * 서버를 거칠 때는 그 앞에 /preview/{포트}/ 가 있어야 같은 컨테이너로 넘어간다.
 * 그래서 path 로 알려 준다. 페이지가 https 면 noVNC 가 알아서 wss 와 443 을 쓴다.
 */
export function buildGuiPreviewUrl(port: string | number): string {
  const query = "autoconnect=true&resize=scale";
  const proxied = buildProxiedPreviewUrl(port, `/vnc.html?${query}`);

  // 호스트는 WebPreview 가 접속한 주소에 맞게 바꾼다.
  if (!proxied) return `http://localhost:${port}/vnc.html?${query}`;

  // 예: https://waivs.duckdns.org/preview → "preview/34567/websockify" (맨 앞 "/" 없이)
  const basePath = new URL(PREVIEW_BASE_URL).pathname.replace(/^\/+|\/+$/g, "");
  const socketPath = [basePath, port, "websockify"].filter(Boolean).join("/");

  return `${proxied}&path=${encodeURIComponent(socketPath)}`;
}
