"use client";

// 경로: src/features/design/export/printDesign.ts
//
// 만든 HTML 을 인쇄 창에 띄운다.
//
// 새 창(window.open) 대신 숨긴 iframe 을 쓴다. 다이어그램을 캡처하느라
// 클릭과 인쇄 사이에 시간이 뜨는데, 그 사이에 여는 창은 브라우저가 팝업으로
// 보고 막는다. iframe 은 그 문제가 없다.

/** 그림이 다 그려지기 전에 인쇄하면 빈 자리로 찍힌다. */
async function waitForImages(doc: Document): Promise<void> {
  const images = [...doc.images];

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
}

export async function printHtmlDocument(html: string): Promise<void> {
  const frame = document.createElement("iframe");

  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";

  document.body.appendChild(frame);

  const doc = frame.contentDocument;

  if (!doc || !frame.contentWindow) {
    frame.remove();
    throw new Error("인쇄 창을 열지 못했습니다.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  await waitForImages(doc);

  frame.contentWindow.focus();
  frame.contentWindow.print();

  // 인쇄 대화상자가 뜨는 동안 지우면 내용이 사라진다. 넉넉히 두고 치운다.
  window.setTimeout(() => frame.remove(), 60_000);
}
