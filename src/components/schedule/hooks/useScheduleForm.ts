"use client";

import * as React from "react";
import type {
  CalendarEvent,
  Category,
  EventStatus,
  ProjectRole,
  ProjectStage,
} from "../schedule.types";

type Params = {
  selectedISO: string;
};

export function useScheduleForm({ selectedISO }: Params) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [fTitle, setFTitle] = React.useState("");
  const [fDesc, setFDesc] = React.useState("");
  const [fLoc, setFLoc] = React.useState("");
  const [fCat, setFCat] = React.useState<Category>("Work");
  const [fStartDateISO, setFStartDateISO] = React.useState(selectedISO);
  const [fEndDateISO, setFEndDateISO] = React.useState(selectedISO);
  const [fAssignees, setFAssignees] = React.useState("");
  const [fStage, setFStage] = React.useState<ProjectStage>("Planning");
  const [fRole, setFRole] = React.useState<ProjectRole>("Frontend");
  const [fStatus, setFStatus] = React.useState<EventStatus>("Todo");

  React.useEffect(() => {
    if (!editOpen) {
      setFStartDateISO(selectedISO);
      setFEndDateISO(selectedISO);
    }
  }, [selectedISO, editOpen]);

  function resetForm(baseDate: string) {
    setEditingId(null);
    setFTitle("");
    setFDesc("");
    setFLoc("");
    setFCat("Work");
    setFStartDateISO(baseDate);
    setFEndDateISO(baseDate);
    setFAssignees("");
    setFStage("Planning");
    setFRole("Frontend");
    setFStatus("Todo");
  }

  function openCreate(prefillDateISO?: string) {
    const baseDate = prefillDateISO ?? selectedISO;
    resetForm(baseDate);
    setEditOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditingId(event.id);
    setFTitle(event.title);
    setFDesc(event.description ?? "");
    setFLoc(event.location ?? "");
    setFCat(event.category);
    setFStartDateISO(event.startDateISO);
    setFEndDateISO(event.endDateISO);
    setFAssignees((event.assignees ?? []).join(", "));
    setFStage(event.stage ?? "Planning");
    setFRole(event.role ?? "Frontend");
    setFStatus(event.status ?? "Todo");
    setEditOpen(true);
  }

  return {
    editOpen,
    setEditOpen,
    editingId,
    setEditingId,

    fTitle,
    setFTitle,
    fDesc,
    setFDesc,
    fLoc,
    setFLoc,
    fCat,
    setFCat,
    fStartDateISO,
    setFStartDateISO,
    fEndDateISO,
    setFEndDateISO,
    fAssignees,
    setFAssignees,
    fStage,
    setFStage,
    fRole,
    setFRole,
    fStatus,
    setFStatus,

    openCreate,
    openEdit,
  };
}