import { format } from "date-fns";
import type { ProjectStage } from "./schedule.types";

export type StageMap = Map<string, ProjectStage[]>;

export function getDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function getStagesOfDate(
  date: Date,
  dateStageMap: StageMap,
): ProjectStage[] {
  return dateStageMap.get(getDateKey(date)) ?? [];
}

export function getStageColor(stage: ProjectStage) {
  switch (stage) {
    case "Planning":
      return "#3b82f6";
    case "Design":
      return "#ec4899";
    case "Implementation":
      return "#8b5cf6";
    case "Wrapup":
      return "#22c55e";
    default:
      return "#94a3b8";
  }
}

export function getStageLabel(stage: ProjectStage) {
  switch (stage) {
    case "Planning":
      return "기획";
    case "Design":
      return "설계";
    case "Implementation":
      return "구현";
    case "Wrapup":
      return "마무리";
    default:
      return stage;
  }
}
