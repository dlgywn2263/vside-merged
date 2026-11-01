// 경로: src/lib/demo/javaPlacement.ts
//
// 필드 선언을 넣어도 되는 자리인지 판단한다. 컴파일러처럼 완전히 분석하지 않고, 판단이
// 애매하면 "넣지 않는다" 쪽으로 기운다. 발표 중에는 입력이 안 되는 것이 잘못 들어가는 것보다 낫다.

type ScanState = "code" | "lineComment" | "blockComment" | "string" | "char" | "textBlock";

/** 주석과 문자열을 같은 길이의 공백으로 지운다. 줄바꿈은 남긴다. */
function scan(text: string): { code: string; state: ScanState } {
  let state: ScanState = "code";
  let code = "";

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    const blank = char === "\n" || char === "\r" ? char : " ";

    if (state === "code") {
      if (char === "/" && next === "/") {
        state = "lineComment";
      } else if (char === "/" && next === "*") {
        state = "blockComment";
      } else if (text.startsWith('"""', i)) {
        state = "textBlock";
        code += "  ";
        i += 2;
      } else if (char === '"') {
        state = "string";
      } else if (char === "'") {
        state = "char";
      } else {
        code += char;
        continue;
      }
      code += blank;
      continue;
    }

    if (state === "lineComment") {
      if (char === "\n") state = "code";
    } else if (state === "blockComment") {
      if (char === "*" && next === "/") {
        state = "code";
        code += " ";
        i += 1;
      }
    } else if (state === "textBlock") {
      if (char === "\\") {
        code += " ";
        i += 1;
      } else if (text.startsWith('"""', i)) {
        state = "code";
        code += "  ";
        i += 2;
      }
    } else {
      // 문자열·문자 리터럴은 줄을 넘지 않는다.
      if (char === "\\") {
        code += " ";
        i += 1;
      } else if ((state === "string" && char === '"') || (state === "char" && char === "'")) {
        state = "code";
      } else if (char === "\n") {
        state = "code";
      }
    }
    code += blank;
  }

  return { code, state };
}

/** 주석과 문자열에 적힌 것은 선언이 아니므로, 중복 검사는 이 결과로 한다. */
export const stripJavaNoise = (text: string) => scan(text).code;

/**
 * offset 이 최상위 클래스의 본문 바로 안이고, 앞선 선언이 끝난 자리인지 본다.
 * 메서드·생성자·초기화 블록·익명 클래스 안, 클래스 밖, interface·enum 안, 주석 안은 false 다.
 */
export function isClassFieldPosition(text: string, offset: number): boolean {
  const { code, state } = scan(text.slice(0, offset));
  if (state !== "code") return false;

  const stack: boolean[] = [];
  let header = "";

  for (const char of code) {
    if (char === "{") {
      stack.push(/(^|[^.\w])class\s+\w+/.test(header));
      header = "";
    } else if (char === "}") {
      stack.pop();
      header = "";
    } else if (char === ";") {
      header = "";
    } else {
      header += char;
    }
  }

  // header 가 남아 있으면 선언을 쓰는 중이다(@Override 다음 줄, 여러 줄에 걸친 식 등).
  return stack.length === 1 && stack[0] === true && header.trim() === "";
}

/** 빈 줄에 넣을 때의 들여쓰기. 위쪽 코드에 맞추고, 클래스 첫 줄이면 한 단계 더 들인다. */
export function resolveFieldIndent(linesAbove: string[]): string {
  for (let i = linesAbove.length - 1; i >= 0; i -= 1) {
    const line = linesAbove[i];
    if (line.trim() === "") continue;
    const indent = line.match(/^\s*/)?.[0] ?? "";
    return line.trimEnd().endsWith("{") && /(^|[^.\w])class\s+\w+/.test(line)
      ? `${indent}    `
      : indent;
  }
  return "    ";
}
