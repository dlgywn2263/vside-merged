import { saveFileHandle } from './fileHandles';

// ID 생성기 (UUID 라이브러리 없이)
const genId = () => 'id_' + Math.random().toString(36).substr(2, 9);

const getLanguage = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', html: 'html', css: 'css', json: 'json', py: 'python', c: 'c', java: 'java' };
  return map[ext] || 'plaintext';
};

// 폴더를 재귀적으로 탐색
const processEntry = async (entry, parentId) => {
  const id = genId();
  
  // [중요] 실제 파일이라면 핸들을 저장소에 등록 (나중에 저장하기 위해)
  if (entry.kind === 'file') {
    saveFileHandle(id, entry);
    const file = await entry.getFile();
    const text = await file.text();
    
    return {
      id,
      name: entry.name,
      type: 'file',
      parentId,
      language: getLanguage(entry.name),
      value: text
    };
  } 
  // 폴더라면 재귀 탐색
  else if (entry.kind === 'directory') {
    const children = [];
    // 비동기 이터레이터 처리
    for await (const child of entry.values()) {
      children.push(await processEntry(child, id));
    }
    // 폴더 이름순 정렬 (선택 사항)
    children.sort((a, b) => (a.type === b.type ? 0 : a.type === 'folder' ? -1 : 1));

    return {
      id,
      name: entry.name,
      type: 'folder',
      parentId,
      children
    };
  }
};

// [메인 함수] 폴더 열기
export const openLocalDirectory = async () => {
  try {
    const dirHandle = await window.showDirectoryPicker();
    const tree = await processEntry(dirHandle, 'root');
    // Redux에는 배열 형태로 저장
    return [tree];
  } catch (err) {
    if (err.name !== 'AbortError') console.error('폴더 열기 실패:', err);
    return null;
  }
};