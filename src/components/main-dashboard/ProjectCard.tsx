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
      className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#5873F9]/50 hover:shadow-md transition-all group flex flex-col justify-between min-h-[210px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5873F9]/30"
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className="bg-gray-100 text-gray-600 text-[11px] font-medium px-2.5 py-1 rounded-md">
            {project.tech}
          </span>

          <span
            className={`text-[11px] font-semibold px-2 py-1 rounded-md ${
              project.type === "team"
                ? "text-blue-600 bg-blue-50"
                : "text-purple-600 bg-purple-50"
            }`}
          >
            {project.type === "team" ? "Team" : "Personal"}
          </span>
        </div>

        <h3 className="font-bold text-gray-900 group-hover:text-[#5873F9] transition-colors truncate">
          {project.title}
        </h3>

        <p className="mt-1 text-xs text-gray-400">
          {project.role === "owner" ? "Owner" : "Member"}
        </p>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-xs text-gray-400">{project.lastModified}</span>

          <span className="text-xs font-semibold text-[#5873F9]">
            {project.progress}%
          </span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-[#5873F9] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${project.progress}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link
            href={getDevlogHref(project.workspaceId)}
            onClick={handleButtonClick}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-600 hover:border-[#5873F9] hover:bg-[#F7F9FF] hover:text-[#5873F9] transition-colors"
          >
            개발일지
          </Link>

          <Link
            href={getScheduleHref(project.workspaceId, project.type)}
            onClick={handleButtonClick}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-600 hover:border-[#5873F9] hover:bg-[#F7F9FF] hover:text-[#5873F9] transition-colors"
          >
            일정
          </Link>

          <Link
            href={getAivsHref(project.workspaceId, project.type)}
            onClick={handleButtonClick}
            className="inline-flex items-center justify-center rounded-lg bg-[#5873F9] px-2 py-2 text-xs font-semibold text-white hover:bg-[#4863E8] transition-colors"
          >
            AIVS
          </Link>
        </div>
      </div>
    </div>
  );
}
