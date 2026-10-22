"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

import type { RecentProject } from "./dashboard.types";
import {
  getAivsHref,
  getDevlogHref,
  getProjectMainHref,
  getScheduleHref,
} from "./dashboard.utils";

type Props = {
  project: RecentProject;
};

export default function ProjectCard({ project }: Props) {
  const router = useRouter();
  const projectMainHref = getProjectMainHref(project);

  const handleCardClick = () => {
    router.push(projectMainHref);
  };

  const handleButtonClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(projectMainHref);
        }
      }}
      className="group flex min-h-[188px] cursor-pointer flex-col justify-between rounded-md border border-gray-200 bg-white p-4 transition-colors hover:border-[#AAB8FF] focus:outline-none focus-visible:border-[#5873F9]"
    >
      <div>
        <div className="mb-2.5 flex items-center gap-1.5">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600">
            {project.tech}
          </span>

          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
              project.type === "team"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {project.type === "team" ? "Team" : "Personal"}
          </span>
        </div>

        <h3 className="truncate text-sm font-bold text-gray-900 transition-colors group-hover:text-[#5873F9]">
          {project.title}
        </h3>

        <p className="mt-1 text-xs text-gray-500">
          {project.role === "owner" ? "Owner" : "Member"}
        </p>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-gray-400">{project.lastModified}</span>

          <span className="shrink-0 text-xs font-bold tabular-nums text-[#5873F9]">
            {project.progress}%
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="bg-[#5873F9] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <Link
            href={getDevlogHref(project.workspaceId, project.type)}
            onClick={handleButtonClick}
            className="inline-flex h-8 items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 transition-colors hover:border-[#AAB8FF] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
          >
            개발일지
          </Link>

          <Link
            href={getScheduleHref(project.workspaceId, project.type)}
            onClick={handleButtonClick}
            className="inline-flex h-8 items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 transition-colors hover:border-[#AAB8FF] hover:bg-[#F7F9FF] hover:text-[#5873F9]"
          >
            일정
          </Link>

          <Link
            href={getAivsHref(project.workspaceId, project.type)}
            onClick={handleButtonClick}
            className="inline-flex h-8 items-center justify-center rounded-md bg-[#5873F9] px-2 text-xs font-semibold text-white transition-colors hover:bg-[#4863E8]"
          >
            AIVS
          </Link>
        </div>
      </div>
    </div>
  );
}
