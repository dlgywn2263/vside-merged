import { configureStore } from "@reduxjs/toolkit";
import fileSystemReducer from "./slices/fileSystemSlice";
import uiReducer from "./slices/uiSlice";
import problemReducer from "./slices/problemSlice";
import safeRunReducer from "./slices/safeRunSlice";
import sandboxReducer from "./slices/sandboxSlice";

export const store = configureStore({
  reducer: {
    fileSystem: fileSystemReducer,
    ui: uiReducer,
    problems: problemReducer,
    safeRun: safeRunReducer,
    sandbox: sandboxReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
