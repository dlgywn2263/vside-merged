import { format } from "date-fns";
import type { ProjectStage } from "./schedule.types";

type StageMap = Map<string, ProjectStage>;

type Params = {
  dateStageMap: StageMap;
};

export function buildCalendarModifiers({ dateStageMap }: Params) {
  return {
    planning: (date: Date) =>
      dateStageMap.get(format(date, "yyyy-MM-dd")) === "Planning",
    design: (date: Date) =>
      dateStageMap.get(format(date, "yyyy-MM-dd")) === "Design",
    development: (date: Date) =>
      dateStageMap.get(format(date, "yyyy-MM-dd")) === "Development",
    finalization: (date: Date) =>
      dateStageMap.get(format(date, "yyyy-MM-dd")) === "Finalization",
  };
}

export function buildCalendarModifierClassNames() {
  const base =
    "after:content-[''] after:absolute after:left-1.5 after:right-1.5 after:bottom-1 after:h-[3px] after:rounded-full after:z-[2]";

  return {
    planning: `${base} after:bg-blue-500`,
    design: `${base} after:bg-pink-500`,
    development: `${base} after:bg-purple-500`,
    finalization: `${base} after:bg-green-500`,
  };
}