// 라이브러리 이름 추출 (import ... from 'react' -> 'react')
const parseImports = (code) => {
  const regex = /import\s+(?:[\w*{}\n\r\t, ]+\s+from\s+)?["']([^"']+)["']/g;
  const matches = [];
  let match;
  while ((match = regex.exec(code)) !== null) {
    matches.push(match[1]);
  }
  return matches;
};

// CDN에서 타입 정의 파일(.d.ts) 가져오기
export const fetchTypeDefinitions = async (packageName, monaco) => {
  if (!packageName || packageName.startsWith('.')) return; // 로컬 파일 무시

  // 이미 로드된 타입이면 스킵
  const libUri = `file:///node_modules/@types/${packageName}/index.d.ts`;
  if (monaco.languages.typescript.javascriptDefaults.getExtraLibs()[libUri]) return;

  try {
    // 1. esm.sh에서 타입 Url 확인
    // (실제로는 더 복잡한 로직이 필요하지만, 여기서는 간소화된 ATA 구현)
    const response = await fetch(`https://unpkg.com/${packageName}/package.json`);
    const pkg = await response.json();
    
    let typesPath = pkg.types || pkg.typings;
    if (!typesPath) {
        // @types 패키지 시도 (예: react -> @types/react)
        const typePkgResp = await fetch(`https://unpkg.com/@types/${packageName}/package.json`);
        if(typePkgResp.ok) {
            const typePkg = await typePkgResp.json();
            typesPath = typePkg.types || typePkg.typings || 'index.d.ts';
            // @types 경로로 재설정
            const dtsResponse = await fetch(`https://unpkg.com/@types/${packageName}/${typesPath}`);
            const dtsContent = await dtsResponse.text();
            
            monaco.languages.typescript.javascriptDefaults.addExtraLib(
                dtsContent,
                libUri
            );
            console.log(`[ATA] Loaded types for @types/${packageName}`);
            return;
        }
        return;
    }

    // 2. 타입 파일 내용 가져오기
    const dtsResponse = await fetch(`https://unpkg.com/${packageName}/${typesPath}`);
    const dtsContent = await dtsResponse.text();

    // 3. Monaco에 타입 주입
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      dtsContent,
      libUri
    );
    console.log(`[ATA] Loaded types for ${packageName}`);

  } catch (e) {
    console.warn(`[ATA] Failed to fetch types for ${packageName}`, e);
  }
};

// 코드 내의 import를 분석해서 타입 가져오기 실행
export const autoTypeAcquisition = async (code, monaco) => {
  const libraries = parseImports(code);
  for (const lib of libraries) {
    await fetchTypeDefinitions(lib, monaco);
  }
};