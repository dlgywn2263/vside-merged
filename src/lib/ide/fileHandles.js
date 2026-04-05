// 파일 핸들(실제 파일 연결 고리)을 저장하는 Map
const fileHandles = new Map();

// 핸들 저장
export const saveFileHandle = (id, handle) => {
  fileHandles.set(id, handle);
};

// 핸들 가져오기
export const getFileHandle = (id) => {
  return fileHandles.get(id);
};

// 초기화
export const clearFileHandles = () => {
  fileHandles.clear();
};