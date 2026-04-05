"use client";

import dynamic from "next/dynamic";

const IdeMain = dynamic(() => import("@/components/ide/IdeMain.jsx"), {
  ssr: false,
});

export default function PersonalIdePage() {
  return <IdeMain />;
}
