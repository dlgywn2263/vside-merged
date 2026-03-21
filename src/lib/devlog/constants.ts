import { FormValue, StageType } from "./types";
import { todayYmd } from "./utils";

export const API_BASE = "http://localhost:8080";

export const stageMeta: Record<
  StageType,
  { label: string; description: string }
> = {
  planning: {
    label: "기획",
    description: "요구사항 정리, 방향 설정",
  },
  design: {
    label: "설계",
    description: "구조 설계, 화면 설계, DB/흐름 설계",
  },
  implementation: {
    label: "구현",
    description: "기능 개발, 테스트, 적용",
  },
  wrapup: {
    label: "마무리",
    description: "리팩토링, 문서화, 점검",
  },
};

export const emptyForm: FormValue = {
  projectId: "",
  title: "",
  summary: "",
  content: "",
  date: todayYmd(),
  tagsText: "",
  stage: "planning",
  goal: "",
  design: "",
  issue: "",
  solution: "",
  nextPlan: "",
  commitHash: "",
  progress: "0",
};
