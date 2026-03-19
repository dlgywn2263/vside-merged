import type { ProjectStage } from "./schedule.types";

export const STAGE_BADGE_COLORS: Record<ProjectStage, string> = {
  Planning: "bg-blue-500 text-white hover:bg-blue-500",
  Design: "bg-pink-500 text-white hover:bg-pink-500",
  Development: "bg-purple-500 text-white hover:bg-purple-500",
  Finalization: "bg-green-500 text-white hover:bg-green-500",
};

export const STAGE_LABELS: Record<ProjectStage, string> = {
  Planning: "기획",
  Design: "설계",
  Development: "구현",
  Finalization: "마무리",
};