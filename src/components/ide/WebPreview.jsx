"use client";

import React, { useState, useEffect, useRef } from "react";
import { Rnd } from "react-rnd"; 
import { useSelector, useDispatch } from "react-redux";
import { setIsPreviewVisible } from "@/store/slices/uiSlice";
import { VscClose, VscGlobe, VscRefresh, VscChromeMinimize, VscChromeRestore, VscChromeMaximize } from "react-icons/vsc";

export default function WebPreview() {
  const dispatch = useDispatch();
  const { isPreviewVisible, previewUrl: reduxPreviewUrl } = useSelector((state) => state.ui);

  const [refreshKey, setRefreshKey] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const [inputUrl, setInputUrl] = useState("");
  const [activeUrl, setActiveUrl] = useState("");

  const [rndState, setRndState] = useState({
    width: 600,
    height: 450,
    x: 0,
    y: 0,
  });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setRndState(prev => ({
      ...prev,
      x: window.innerWidth - 650,
      y: 50
    }));
  }, []);

  useEffect(() => {
    if (reduxPreviewUrl) {
      setInputUrl(reduxPreviewUrl);
      setActiveUrl(reduxPreviewUrl);
    }
  }, [reduxPreviewUrl]);

  const handleUrlSubmit = (e) => {
    if (e.key === "Enter") {
      const finalUrl = inputUrl.startsWith("http") ? inputUrl : `http://${inputUrl}`;
      setInputUrl(finalUrl);
      setActiveUrl(finalUrl);
      setRefreshKey(prev => prev + 1);
    }
  };

  if (!isPreviewVisible || !isMounted) return null;

  return (
    <Rnd
      size={
        isMinimized ? { width: 300, height: 44 } :
        isMaximized ? { width: "85vw", height: "85vh" } :
        { width: rndState.width, height: rndState.height }
      }
      position={
        isMinimized ? { x: rndState.x, y: rndState.y } :
        isMaximized ? { x: window.innerWidth * 0.075, y: window.innerHeight * 0.075 } :
        { x: rndState.x, y: rndState.y }
      }
      onDragStop={(e, d) => {
        if (!isMaximized && !isMinimized) setRndState(prev => ({ ...prev, x: d.x, y: d.y }));
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        setRndState({
          width: ref.style.width,
          height: ref.style.height,
          x: position.x,
          y: position.y
        });
      }}
      minWidth={350}
      minHeight={isMinimized ? 44 : 250}
      disableDragging={isMaximized}
      enableResizing={!isMaximized && !isMinimized}
      dragHandleClassName="preview-header"
      bounds="window"
      // 💡 [수정] react-rnd가 스타일을 망치지 못하게 최상위는 투명한 z-index 껍데기로만 사용합니다.
      className="z-[9999]"
      style={{ transition: (isMaximized || isMinimized) ? "all 0.3s ease-in-out" : "none" }}
    >
      {/* 💡 [NEW 핵심] w-full h-full을 가진 내부 래퍼를 두어 iframe이 화면 끝까지 꽉 차도록 강제합니다! */}
      <div className="w-full h-full bg-[#f3f4f6] border border-gray-300 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        <div className="preview-header bg-gray-200 px-4 py-2.5 flex items-center justify-between cursor-move select-none border-b border-gray-300 h-[44px] shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500"></div>
            </div>
            <div className="ml-3 flex items-center gap-1.5 text-gray-600">
              <VscGlobe size={14} className="text-blue-500" />
              <span className="text-[12px] font-bold tracking-tight">웹 미리보기</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => {
              setIsMinimized(!isMinimized);
              if (!isMinimized) setIsMaximized(false);
            }} className="p-1 hover:bg-gray-300 rounded-md transition-colors text-gray-500" title="최소화">
              {isMinimized ? <VscChromeRestore size={16} /> : <VscChromeMinimize size={16} />}
            </button>

            <button onClick={() => {
              setIsMaximized(!isMaximized);
              if (!isMaximized) setIsMinimized(false);
            }} className="p-1 hover:bg-gray-300 rounded-md transition-colors text-gray-500" title="최대화">
              {isMaximized ? <VscChromeRestore size={16} /> : <VscChromeMaximize size={16} />}
            </button>

            <button onClick={() => dispatch(setIsPreviewVisible(false))} className="p-1 hover:bg-gray-300 rounded-md transition-colors text-gray-500" title="닫기">
              <VscClose size={16} strokeWidth={1} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="bg-gray-100 px-4 py-2 flex items-center gap-3 border-b border-gray-300 shrink-0">
              <button onClick={() => setRefreshKey(prev => prev + 1)} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors" title="새로고침">
                <VscRefresh size={16} />
              </button>
              <input 
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={handleUrlSubmit}
                placeholder="http://localhost:8080 입력 후 엔터"
                className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-1.5 text-[12px] text-gray-700 font-mono shadow-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              />
            </div>

            <div className="flex-1 bg-white relative">
              {activeUrl ? (
                <iframe 
                  key={refreshKey}
                  src={activeUrl} 
                  // 💡 [NEW] absolute와 inset-0을 추가해 flex 오류 상황에서도 부모 크기에 100% 꽉 맞물리도록 쐐기를 박습니다.
                  className="absolute inset-0 w-full h-full border-none bg-white"
                  title="Web Preview"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                  <VscGlobe size={48} className="mb-3 opacity-30 text-blue-500" />
                  <p className="text-[13px] font-bold">서버 실행 로그를 기다리는 중입니다...</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Rnd>
  );
}