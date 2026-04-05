"use client";

import dynamic from "next/dynamic";

const TeamIdeMain = dynamic(() => import("@/components/ide/TeamIdeMain.jsx"), {
  ssr: false,
});

export default function TeamIdePage() {
  return <TeamIdeMain />;
}
