// 경로: src/config/demoCodeSnippets.ts
//
// 발표 때 에디터에 자동 입력할 코드. 어느 파일에 누가 넣는지는 demoInputConfig.ts 에서 정한다.

/** 코드맵에서 만든 SearchFrame.java 의 클래스 안에 시연자가 입력하는 필드 한 줄. */
export const NAME_FIELD_CODE = `private final JTextField nameField = new JTextField("김민수", 16);`;

/** 같은 파일에 보조 시연자가 동시에 입력하는 필드 한 줄. */
export const SEARCH_BUTTON_FIELD_CODE = `private final JButton searchButton = new JButton("예약 조회");`;
