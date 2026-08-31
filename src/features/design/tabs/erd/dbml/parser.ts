// 경로: src/features/design/tabs/erd/dbml/parser.ts
//
// DBML 을 아주 좁게 흉내 낸 문법의 파서.
//
// 전부 지원하지 않는다. 학생이 5초 안에 읽고 따라 칠 수 있는 만큼만 받는다.
//
//   Table users {
//     id       bigint       [pk]
//     email    varchar(255) [not null, unique]
//     team_id  bigint       [ref: > teams.id]
//   }
//
//   Ref: products.user_id > users.id
//
// 실패를 예외로 던지지 않고 오류 목록으로 돌려주는 것이 중요하다.
// 사람이 타이핑하는 동안 문서는 거의 항상 깨진 상태이기 때문에, 던지면
// 화면이 계속 무너진다. 대신 어디가 잘못됐는지 줄 번호로 알려 준다.

export interface ParsedColumn {
  name: string;
  type: string;
  length: number | null;
  nullable: boolean;
  isPk: boolean;
  unique: boolean;
  defaultValue: string;
  comment: string;
  /** 컬럼 줄에 인라인으로 붙은 참조. */
  ref: ParsedRef | null;
  line: number;
}

export interface ParsedTable {
  name: string;
  note: string;
  columns: ParsedColumn[];
  line: number;
}

export interface ParsedRef {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  /** 화살표 방향을 그대로 옮긴 값. `>` 는 다대일이다. */
  cardinality: "1:1" | "1:N" | "N:M";
}

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  tables: ParsedTable[];
  refs: ParsedRef[];
  errors: ParseError[];
}

const TABLE_OPEN = /^Table\s+("?)([A-Za-z_][\w]*)\1\s*\{$/i;
const REF_LINE = /^Ref\s*:\s*(.+)$/i;
const REF_BODY = /^([\w]+)\.([\w]+)\s*(<>|[<>-])\s*([\w]+)\.([\w]+)$/;
const COLUMN_LINE = /^([\w]+)\s+([A-Za-z][\w]*)(?:\s*\(\s*(\d+)\s*\))?\s*(?:\[(.*)\])?$/;

function cardinalityOf(symbol: string): ParsedRef["cardinality"] {
  if (symbol === "<>") return "N:M";
  if (symbol === "-") return "1:1";
  return "1:N";
}

function stripComment(line: string): string {
  const index = line.indexOf("//");
  return index >= 0 ? line.slice(0, index) : line;
}

function parseSettings(raw: string | undefined) {
  const settings = {
    isPk: false,
    nullable: true,
    unique: false,
    defaultValue: "",
    comment: "",
    ref: null as ParsedRef | null,
    refSymbol: "",
    refTarget: "",
  };

  if (!raw) return settings;

  // 대괄호 안은 쉼표로 나뉘지만, note 나 default 안의 쉼표는 나누면 안 된다.
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let buffer = "";

  for (const char of raw) {
    if (quote) {
      buffer += char;
      if (char === quote) quote = "";
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      buffer += char;
      continue;
    }

    if (char === "(") depth += 1;
    if (char === ")") depth -= 1;

    if (char === "," && depth === 0) {
      parts.push(buffer.trim());
      buffer = "";
      continue;
    }

    buffer += char;
  }

  if (buffer.trim()) parts.push(buffer.trim());

  for (const part of parts) {
    const lower = part.toLowerCase();

    if (lower === "pk" || lower === "primary key") {
      settings.isPk = true;
      settings.nullable = false;
      continue;
    }

    if (lower === "not null") {
      settings.nullable = false;
      continue;
    }

    if (lower === "null") {
      settings.nullable = true;
      continue;
    }

    if (lower === "unique") {
      settings.unique = true;
      continue;
    }

    if (lower === "increment") {
      continue;
    }

    if (lower.startsWith("default:")) {
      settings.defaultValue = part.slice(part.indexOf(":") + 1).trim();
      continue;
    }

    if (lower.startsWith("note:")) {
      settings.comment = part
        .slice(part.indexOf(":") + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      continue;
    }

    if (lower.startsWith("ref:")) {
      const body = part.slice(part.indexOf(":") + 1).trim();
      const matched = /^(<>|[<>-])\s*([\w]+)\.([\w]+)$/.exec(body);

      if (matched) {
        settings.refSymbol = matched[1];
        settings.refTarget = `${matched[2]}.${matched[3]}`;
      }
      continue;
    }
  }

  return settings;
}

export function parseDbml(source: string): ParseResult {
  const tables: ParsedTable[] = [];
  const refs: ParsedRef[] = [];
  const errors: ParseError[] = [];

  const lines = source.split(/\r?\n/);
  let current: ParsedTable | null = null;

  lines.forEach((rawLine, index) => {
    const line = index + 1;
    const text = stripComment(rawLine).trim();

    if (!text) return;

    if (current === null) {
      const tableMatch = TABLE_OPEN.exec(text);

      if (tableMatch) {
        const name = tableMatch[2];

        if (tables.some((table) => table.name === name)) {
          errors.push({ line, message: `테이블 이름이 중복됩니다: ${name}` });
        }

        current = { name, note: "", columns: [], line };
        return;
      }

      const refMatch = REF_LINE.exec(text);

      if (refMatch) {
        const body = REF_BODY.exec(refMatch[1].trim());

        if (!body) {
          errors.push({
            line,
            message: "관계는 Ref: 테이블.컬럼 > 테이블.컬럼 형태로 적어 주세요.",
          });
          return;
        }

        refs.push({
          fromTable: body[1],
          fromColumn: body[2],
          cardinality: cardinalityOf(body[3]),
          toTable: body[4],
          toColumn: body[5],
        });
        return;
      }

      errors.push({ line, message: `이해할 수 없는 줄입니다: ${text}` });
      return;
    }

    if (text === "}") {
      tables.push(current);
      current = null;
      return;
    }

    const noteMatch = /^note\s*:\s*(.+)$/i.exec(text);
    if (noteMatch) {
      current.note = noteMatch[1].trim().replace(/^["']|["']$/g, "");
      return;
    }

    const columnMatch = COLUMN_LINE.exec(text);

    if (!columnMatch) {
      errors.push({
        line,
        message: "컬럼은 이름 타입 [옵션] 형태로 적어 주세요. 예: email varchar(255) [not null]",
      });
      return;
    }

    const [, name, type, lengthText, settingsText] = columnMatch;
    const settings = parseSettings(settingsText);

    if (current.columns.some((column) => column.name === name)) {
      errors.push({ line, message: `컬럼 이름이 중복됩니다: ${name}` });
    }

    let ref: ParsedRef | null = null;

    if (settings.refTarget) {
      const [toTable, toColumn] = settings.refTarget.split(".");
      ref = {
        fromTable: current.name,
        fromColumn: name,
        toTable,
        toColumn,
        cardinality: cardinalityOf(settings.refSymbol),
      };
      refs.push(ref);
    }

    current.columns.push({
      name,
      type: type.toUpperCase(),
      length: lengthText ? Number(lengthText) : null,
      nullable: settings.nullable,
      isPk: settings.isPk,
      unique: settings.unique,
      defaultValue: settings.defaultValue,
      comment: settings.comment,
      ref,
      line,
    });
  });

  if (current !== null) {
    errors.push({
      line: (current as ParsedTable).line,
      message: `테이블 ${(current as ParsedTable).name} 의 닫는 중괄호가 없습니다.`,
    });
  }

  return { tables, refs, errors };
}
