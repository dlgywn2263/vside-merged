// src/components/ide/VoiceChatManager.jsx
"use client";

import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '@/lib/ide/AuthContext';
import { useWebRTC } from '@/hooks/useWebRTC';
import { setVoiceConnected } from '@/store/slices/uiSlice';

// 💡 1. 오디오 재생 컴포넌트 (투명)
const PeerAudio = ({ stream }) => {
    const audioRef = useRef(null);

    useEffect(() => {
        const audioElement = audioRef.current;
        if (audioElement && stream) {
            audioElement.srcObject = stream;
            audioElement.volume = 1.0;
            audioElement.muted = false; 
            
            audioElement.onloadedmetadata = () => {
                audioElement.play().catch(e => console.error("오디오 자동재생 실패:", e));
            };
        }
        return () => {
            if (audioElement) {
                audioElement.srcObject = null;
                audioElement.onloadedmetadata = null;
            }
        };
    }, [stream]);
    
    return <audio ref={audioRef} autoPlay playsInline className="absolute w-0 h-0 opacity-0 pointer-events-none" />;
};

// 💡 2. 보이지 않는 매니저 컴포넌트
export default function VoiceChatManager() {
    const dispatch = useDispatch();
    const { user } = useAuth();
    const { workspaceId } = useSelector(state => state.fileSystem);
    const { isVoiceConnected } = useSelector(state => state.ui);

    // Redux의 isVoiceConnected가 true일 때만 WebRTC 엔진이 가동됩니다!
    const { peers, leaveRoom } = useWebRTC(
        isVoiceConnected ? workspaceId : null, 
        isVoiceConnected ? user?.id : null
    );

    // 혹시라도 워크스페이스를 나가면 보이스챗도 끄기
    useEffect(() => {
        if (!workspaceId && isVoiceConnected) {
            dispatch(setVoiceConnected(false));
            leaveRoom();
        }
    }, [workspaceId, isVoiceConnected, dispatch, leaveRoom]);

    if (!isVoiceConnected) return null;

    return (
        <div style={{ display: 'none' }}>
            {Object.entries(peers).map(([peerId, stream]) => (
                <PeerAudio key={peerId} stream={stream} />
            ))}
        </div>
    );
}