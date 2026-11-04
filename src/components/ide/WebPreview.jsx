"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import { useSelector, useDispatch } from "react-redux";
import { setIsPreviewVisible } from "@/store/slices/uiSlice";
import {
  VscClose,
  VscGlobe,
  VscRefresh,
  VscChromeMinimize,
  VscChromeRestore,
  VscChromeMaximize,
} from "react-icons/vsc";
import { toBrowserPreviewUrl as normalizePreviewUrl } from "@/lib/ide/previewUrl";
import { RunSocket } from "@/lib/ide/runSocket";

// 앱 화면(noVNC)은 누른 키만 보내서 한글이 조합되지 않는다(실행 환경에 한글 입력기가 없다).
// 여기서 내 PC 의 입력기로 조합을 끝낸 글자를 보내면, 서버가 앱 화면에서 지금 선택된 칸에 대신 친다.
function KoreanInputBar() {
  const [text, setText] = useState("");

  const send = () => {
    if (!text) return;
    RunSocket.sendGuiText(text);
    setText("");
  };

  return (
    <div className="flex shrink-0 items-center gap-2 border-t-2 border-blue-500 bg-blue-50 px-3 py-2">
      <span className="shrink-0 rounded-md bg-blue-600 px-2 py-1 text-[12px] font-black text-white">
        한글 입력
      </span>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // 한글을 조합하는 중에 누른 Enter 는 조합을 끝내는 키다. 그때 보내면 마지막 글자가 빠진다.
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            send();
          }
        }}
        placeholder="앱 화면에서 입력할 칸을 먼저 클릭한 뒤, 여기에 쓰고 Enter"
        className="min-w-0 flex-1 rounded-md border-2 border-blue-300 bg-white px-3 py-1.5 text-[13px] text-gray-800 outline-none focus:border-blue-500"
      />
      <button
        type="button"
        onClick={send}
        disabled={!text}
        className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
      >
        보내기
      </button>
    </div>
  );
}

export default function WebPreview() {
  const dispatch = useDispatch();

  const {
    isPreviewVisible,
    previewUrl: reduxPreviewUrl,
    guiPreviewUrl,
    isGuiAppReady,
    isRunning,
  } = useSelector((state) => state.ui);

  const [refreshKey, setRefreshKey] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const [inputUrl, setInputUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState("");

  // 창(Swing)을 쓰는 프로그램을 실행했을 때만 탭이 생긴다. "app" = 앱 화면, "api" = API 서버.
  // 창을 안 쓰는 실행에서는 guiPreviewUrl 이 비어 있어 예전 화면과 똑같다.
  //
  // "API 서버 탭을 골랐다"를 어느 실행의 앱 화면에서 골랐는지와 함께 기억한다. 실행마다
  // 주소(포트)가 달라지므로, 새로 실행하면 따로 되돌리지 않아도 앱 화면 탭부터 보인다.
  const [apiTabChosenFor, setApiTabChosenFor] = useState("");
  const appScreenUrl = guiPreviewUrl ? normalizePreviewUrl(guiPreviewUrl) : "";
  const hasAppScreen = Boolean(appScreenUrl);
  const activeTab = apiTabChosenFor === guiPreviewUrl ? "api" : "app";
  const isAppTab = hasAppScreen && activeTab === "app";

  const [rndState, setRndState] = useState({
    width: 600,
    height: 450,
    x: 0,
    y: 0,
  });

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    setRndState((prev) => ({
      ...prev,
      x: Math.max(window.innerWidth - 650, 20),
      y: 50,
    }));
  }, []);

  useEffect(() => {
    if (!reduxPreviewUrl) return;

    const normalizedUrl = normalizePreviewUrl(reduxPreviewUrl);

    setInputUrl(normalizedUrl);
    setActiveUrl(normalizedUrl);
    setRefreshKey((prev) => prev + 1);
  }, [reduxPreviewUrl]);

  const handleUrlSubmit = (e) => {
    if (e.key !== "Enter") return;

    const normalizedUrl = normalizePreviewUrl(inputUrl);

    setInputUrl(normalizedUrl);
    setActiveUrl(normalizedUrl);
    setRefreshKey((prev) => prev + 1);
  };

  const handleMinimize = (e) => {
    e.stopPropagation();

    setIsMinimized((prev) => {
      const next = !prev;

      if (next) {
        setIsMaximized(false);
      }

      return next;
    });
  };

  const handleMaximize = (e) => {
    e.stopPropagation();

    setIsMaximized((prev) => {
      const next = !prev;

      if (next) {
        setIsMinimized(false);
      }

      return next;
    });
  };

  const handleClose = (e) => {
    e.stopPropagation();
    dispatch(setIsPreviewVisible(false));
  };

  if (!isPreviewVisible || !isMounted) return null;

  const currentSize = isMinimized
    ? { width: 300, height: 44 }
    : isMaximized
      ? { width: window.innerWidth * 0.85, height: window.innerHeight * 0.85 }
      : { width: rndState.width, height: rndState.height };

  const currentPosition = isMaximized
    ? { x: window.innerWidth * 0.075, y: window.innerHeight * 0.075 }
    : { x: rndState.x, y: rndState.y };

  // IDE 화면은 헤더(61px) 아래에서 시작해서, 그 안에 두면 창 좌표의 기준이 헤더 밑이 되어
  // 헤더 위로 끌어 올릴 수 없었다. 화면 전체를 덮는 투명한 층을 body 에 붙이고 그 안을
  // 움직이게 해서 브라우저 화면 어디로든(맨 위 포함) 옮길 수 있게 한다.
  // 층은 클릭을 통과시키고(pointer-events-none) 창만 클릭을 받는다.
  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none">
    <Rnd
      size={currentSize}
      position={currentPosition}
      onDragStop={(e, d) => {
        if (!isMaximized) {
          setRndState((prev) => ({
            ...prev,
            x: d.x,
            y: d.y,
          }));
        }
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        if (isMaximized || isMinimized) return;

        setRndState({
          width: ref.offsetWidth,
          height: ref.offsetHeight,
          x: position.x,
          y: position.y,
        });
      }}
      minWidth={300}
      minHeight={44}
      disableDragging={isMaximized}
      enableResizing={!isMaximized && !isMinimized}
      dragHandleClassName="preview-header"
      bounds="parent"
      className="pointer-events-auto"
      style={{
        transition: isMaximized ? "all 0.25s ease-in-out" : "none",
      }}
    >
      <div
        className={`w-full h-full bg-[#f3f4f6] border border-gray-300 shadow-2xl flex flex-col overflow-hidden ${
          isMinimized ? "rounded-lg" : "rounded-xl"
        }`}
      >
        <div className="preview-header bg-gray-200 px-4 py-2.5 flex items-center justify-between cursor-move select-none border-b border-gray-300 h-[44px] shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex gap-1.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500"></div>
            </div>

            <div className="ml-3 flex items-center gap-1.5 text-gray-600 min-w-0">
              <VscGlobe size={14} className="text-blue-500 shrink-0" />
              <span className="text-[12px] font-bold tracking-tight truncate">
                웹 미리보기
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleMinimize}
              className="p-1 hover:bg-gray-300 rounded-md transition-colors text-gray-500"
              title={isMinimized ? "복원" : "최소화"}
            >
              {isMinimized ? (
                <VscChromeRestore size={16} />
              ) : (
                <VscChromeMinimize size={16} />
              )}
            </button>

            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleMaximize}
              className="p-1 hover:bg-gray-300 rounded-md transition-colors text-gray-500 disabled:opacity-40"
              title={isMaximized ? "복원" : "최대화"}
              disabled={isMinimized}
            >
              {isMaximized ? (
                <VscChromeRestore size={16} />
              ) : (
                <VscChromeMaximize size={16} />
              )}
            </button>

            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleClose}
              className="p-1 hover:bg-gray-300 rounded-md transition-colors text-gray-500"
              title="닫기"
            >
              <VscClose size={16} strokeWidth={1} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="bg-gray-100 px-4 py-2 flex items-center gap-3 border-b border-gray-300 shrink-0">
              <button
                onClick={() => setRefreshKey((prev) => prev + 1)}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                title="새로고침"
              >
                <VscRefresh size={16} />
              </button>

              {hasAppScreen && (
                <div className="flex shrink-0 rounded-md border border-gray-300 bg-white p-0.5 text-[12px] font-bold">
                  {[
                    { id: "app", label: "앱 화면" },
                    { id: "api", label: "API 서버" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() =>
                        setApiTabChosenFor(tab.id === "api" ? guiPreviewUrl : "")
                      }
                      className={`px-2.5 py-1 rounded transition-colors ${
                        activeTab === tab.id
                          ? "bg-blue-500 text-white"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* 앱 화면에는 사용자가 칠 주소가 없다. 주소창은 API 서버 탭에서만 보인다. */}
              {isAppTab ? (
                <span className="flex-1 truncate text-[12px] text-gray-500">
                  내 프로그램이 띄운 창이에요. 클릭하고 입력할 수 있어요.
                </span>
              ) : (
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={handleUrlSubmit}
                  placeholder="http://IP:포트 입력 후 엔터"
                  className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-1.5 text-[12px] text-gray-700 font-mono shadow-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                />
              )}
            </div>

            <div className="flex-1 bg-white relative">
              {/* 탭을 오가도 화면이 다시 연결되지 않게 둘 다 붙여 두고 가리기만 한다. */}
              {hasAppScreen && (
                <div
                  className={`absolute inset-0 z-10 flex-col bg-[#1f2937] ${
                    isAppTab ? "flex" : "hidden"
                  }`}
                >
                  <div className="relative flex-1">
                    <iframe
                      key={`app-${appScreenUrl}-${refreshKey}`}
                      src={appScreenUrl}
                      className="absolute inset-0 w-full h-full border-none"
                      title="App Screen"
                    />

                    {/* 앱이 켜지기 전에는 빈 화면만 보인다. 고장으로 오해하지 않게 덮어 둔다. */}
                    {!isGuiAppReady && isRunning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                        <p className="text-[13px] font-bold">앱이 켜지는 중이에요…</p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          다 켜지면 여기에 창이 나타나요.
                        </p>
                      </div>
                    )}
                  </div>

                  <KoreanInputBar />
                </div>
              )}

              {activeUrl ? (
                <iframe
                  key={refreshKey}
                  src={activeUrl}
                  className="absolute inset-0 w-full h-full border-none bg-white"
                  title="Web Preview"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                  <VscGlobe
                    size={48}
                    className="mb-3 opacity-30 text-blue-500"
                  />
                  <p className="text-[13px] font-bold">
                    서버 실행 로그를 기다리는 중입니다...
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    localhost 미리보기 주소를 현재 시연 IP로 자동 변환합니다.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Rnd>
    </div>,
    document.body,
  );
}
