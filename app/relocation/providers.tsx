"use client";

import { Provider } from "react-redux";
import { store } from "@/store/store";
import { AuthProvider } from "@/lib/ide/AuthContext";

export default function RearrangeProviders({
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
