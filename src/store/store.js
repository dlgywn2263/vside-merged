import { configureStore } from "@reduxjs/toolkit";
import fileSystemReducer from "./slices/fileSystemSlice";
import uiReducer from "./slices/uiSlice";
import problemReducer from "./slices/problemSlice";

export const store = configureStore({
  reducer: {
    fileSystem: fileSystemReducer,
    ui: uiReducer,
    problems: problemReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
