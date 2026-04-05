import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  markers: [], // 에러 목록 저장소
};

const problemSlice = createSlice({
  name: 'problems',
  initialState,
  reducers: {
    updateMarkers: (state, action) => {
      state.markers = action.payload;
    },
  }
});

export const { updateMarkers } = problemSlice.actions;
export default problemSlice.reducer;