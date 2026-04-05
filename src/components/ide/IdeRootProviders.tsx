"use client";

import { Provider } from "react-redux";
import { store } from "@/store/store.js";
import { AuthProvider } from "@/lib/ide/AuthContext.jsx";

export default function IdeRootProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider store={store}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  );
}
