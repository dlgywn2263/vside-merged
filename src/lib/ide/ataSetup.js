import { setupTypeAcquisition } from '@typescript/ata';
import * as ts from 'typescript'; // [수정] 이렇게 불러와야 오류가 안 납니다.

export function configureATA(monaco) {
  const ata = setupTypeAcquisition({
    projectName: 'my-web-ide',
    typescript: ts, // [수정] ts 객체 전체 전달
    logger: console, 
    delegate: {
      receivedFile: (code, path) => {
        // 모나코 에디터에 타입 정의 주입
        monaco.languages.typescript.javascriptDefaults.addExtraLib(code, `file://${path}`);
        monaco.languages.typescript.typescriptDefaults.addExtraLib(code, `file://${path}`);
      },
    },
  });

  return ata;
}