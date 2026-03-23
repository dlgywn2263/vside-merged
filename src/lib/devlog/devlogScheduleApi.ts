import type {
  ApiScheduleResponse,
  Mode,
} from "@/components/schedule/schedule.types";
import { API_BASE } from "@/lib/devlog/constants";

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  if (!token) {
    throw new Error("로그인 정보가 없습니다. 다시 로그인해주세요.");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "요청 처리 중 오류가 발생했습니다.");
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ([] as T);
}

/**
 * 개발일지 좌측 캘린더용 월간 일정 조회
 */
export async function fetchDevlogMonthSchedules(
  mode: Mode,
  workspaceId: string,
  year: number,
  month: number,
): Promise<ApiScheduleResponse[]> {
  const query = new URLSearchParams({
    view: mode,
    workspaceId,
    year: String(year),
    month: String(month),
  });

  const response = await fetch(`${API_BASE}/api/schedules/calendar?${query}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  return handleJsonResponse<ApiScheduleResponse[]>(response);
}

/**
 * 개발일지 좌측 캘린더용 선택 날짜 일정 조회
 */
export async function fetchDevlogDaySchedules(
  mode: Mode,
  workspaceId: string,
  date: string,
): Promise<ApiScheduleResponse[]> {
  const query = new URLSearchParams({
    view: mode,
    workspaceId,
    date,
    category: "all",
  });

  const response = await fetch(`${API_BASE}/api/schedules?${query}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  return handleJsonResponse<ApiScheduleResponse[]>(response);
}
