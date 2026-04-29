"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';

export const useWebRTC = (workspaceId, myUserId) => {
    const [peers, setPeers] = useState({});
    const [isMuted, setIsMuted] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [speakingUsers, setSpeakingUsers] = useState(new Set()); 

    const localStreamRef = useRef(null);
    const peerConnectionsRef = useRef({});
    const stompClientRef = useRef(null);
    const localSpeakingRef = useRef(false);
    
    const iceQueueRef = useRef({}); 

    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8080';

    useEffect(() => {
        if (!workspaceId || myUserId === null || myUserId === undefined) return;
        
        let isCancelled = false; 

        const initWebRTC = async () => {
            try {
                // 💡 [핵심 해결] 브라우저가 소리를 뚝뚝 끊어먹지 못하게 모든 AI 필터를 강제로 끕니다! (원음 전송)
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { 
                        echoCancellation: false,   // ❌ 하울링 방지 끄기 (긴 소리, 음악 잘림 방지)
                        noiseSuppression: false,   // ❌ 노이즈 캔슬링 끄기
                        autoGainControl: false,    // ❌ 자동 볼륨 조절 끄기
                        // Chrome 전용 강력 필터들도 모조리 해제
                        googEchoCancellation: false,
                        googAutoGainControl: false,
                        googNoiseSuppression: false,
                        googHighpassFilter: false
                    }, 
                    video: false 
                });
                
                if (isCancelled) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                localStreamRef.current = stream;
                monitorLocalAudio(stream);

                const client = new Client({
                    brokerURL: `${WS_BASE_URL}/ws/chat`,
                    reconnectDelay: 5000,
                    onConnect: () => {
                        if (isCancelled) {
                            client.deactivate();
                            return;
                        }
                        setIsConnected(true);
                        
                        client.subscribe(`/topic/workspace/${workspaceId}/webrtc`, (message) => {
                            handleSignalingMessage(JSON.parse(message.body));
                        });

                        setTimeout(() => {
                            if (!isCancelled) {
                                client.publish({
                                    destination: `/topic/workspace/${workspaceId}/webrtc`,
                                    body: JSON.stringify({ type: 'JOIN', senderId: myUserId, workspaceId })
                                });
                            }
                        }, 500);
                    }
                });

                client.activate();
                stompClientRef.current = client;
            } catch (error) {
                console.error("❌ 마이크 접근 실패:", error);
            }
        };

        const flushIceQueue = async (userId, pc) => {
            if (iceQueueRef.current[userId] && iceQueueRef.current[userId].length > 0) {
                for (const iceData of iceQueueRef.current[userId]) {
                    await pc.addIceCandidate(new RTCIceCandidate(iceData)).catch(e => console.error("ICE 추가 실패:", e));
                }
                iceQueueRef.current[userId] = []; 
            }
        };

        const handleSignalingMessage = async (message) => {
            const { type, senderId, receiverId, data } = message;

            if (String(senderId) === String(myUserId)) return; 
            if (receiverId && String(receiverId) !== String(myUserId)) return; 

            try {
                let pc = peerConnectionsRef.current[senderId];

                switch (type) {
                    case 'JOIN':
                        await createPeerConnection(senderId);
                        pc = peerConnectionsRef.current[senderId];
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        sendSignalingMessage('OFFER', senderId, offer);
                        break;
                        
                    case 'OFFER':
                        await createPeerConnection(senderId);
                        pc = peerConnectionsRef.current[senderId];
                        await pc.setRemoteDescription(new RTCSessionDescription(data));
                        await flushIceQueue(senderId, pc); 
                        
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        sendSignalingMessage('ANSWER', senderId, answer);
                        break;
                        
                    case 'ANSWER':
                        pc = peerConnectionsRef.current[senderId];
                        await pc.setRemoteDescription(new RTCSessionDescription(data));
                        await flushIceQueue(senderId, pc); 
                        break;
                        
                    case 'ICE':
                        pc = peerConnectionsRef.current[senderId];
                        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
                            await pc.addIceCandidate(new RTCIceCandidate(data)).catch(e => console.error("ICE 추가 실패:", e));
                        } else {
                            if (!iceQueueRef.current[senderId]) iceQueueRef.current[senderId] = [];
                            iceQueueRef.current[senderId].push(data);
                        }
                        break;
                        
                    case 'SPEAKING':
                        setSpeakingUsers(prev => {
                            const next = new Set(prev);
                            if (data) next.add(String(senderId));
                            else next.delete(String(senderId));
                            return next;
                        });
                        break;
                        
                    case 'LEAVE':
                        removePeer(senderId);
                        break;
                        
                    default:
                        break;
                }
            } catch (err) {
                console.error(`WebRTC 처리 에러 [${type}]:`, err);
            }
        };

        const createPeerConnection = async (remoteUserId) => {
            if (peerConnectionsRef.current[remoteUserId]) return;

            const pc = new RTCPeerConnection(rtcConfig);
            peerConnectionsRef.current[remoteUserId] = pc;
            
            if (!iceQueueRef.current[remoteUserId]) {
                iceQueueRef.current[remoteUserId] = [];
            }

            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
            }

            pc.ontrack = (event) => {
                setPeers(prev => ({ ...prev, [remoteUserId]: event.streams[0] }));
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) sendSignalingMessage('ICE', remoteUserId, event.candidate);
            };
        };

        const sendSignalingMessage = (type, receiverId, data) => {
            if (stompClientRef.current?.connected) {
                stompClientRef.current.publish({
                    destination: `/topic/workspace/${workspaceId}/webrtc`,
                    body: JSON.stringify({ type, senderId: myUserId, receiverId, workspaceId, data })
                });
            }
        };

        initWebRTC();
        
        return () => {
            isCancelled = true;
            leaveRoom();
        };
    }, [workspaceId, myUserId]);

    const monitorLocalAudio = (stream) => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});

            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            let lastSpeakingTime = 0; 

            const updateSpeakingState = (isSpeaking) => {
                if (localSpeakingRef.current === isSpeaking) return;
                localSpeakingRef.current = isSpeaking;

                setSpeakingUsers(prev => {
                    const next = new Set(prev);
                    if (isSpeaking) next.add(String(myUserId));
                    else next.delete(String(myUserId));
                    return next;
                });

                if (stompClientRef.current?.connected) {
                    stompClientRef.current.publish({
                        destination: `/topic/workspace/${workspaceId}/webrtc`,
                        body: JSON.stringify({ type: 'SPEAKING', senderId: myUserId, workspaceId, data: isSpeaking })
                    });
                }
            };

            const checkVolume = () => {
                if (audioCtx.state === 'closed') return;
                if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
                
                analyser.getByteFrequencyData(dataArray);
                
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const averageVolume = sum / dataArray.length;
                
                const isSpeakingNow = averageVolume > 5;
                const currentlyMuted = localStreamRef.current?.getAudioTracks()[0]?.enabled === false;

                if (currentlyMuted) {
                    updateSpeakingState(false);
                } else if (isSpeakingNow) {
                    lastSpeakingTime = Date.now(); 
                    updateSpeakingState(true);
                } else {
                    if (Date.now() - lastSpeakingTime > 1000) {
                        updateSpeakingState(false);
                    }
                }
                
                setTimeout(checkVolume, 150); 
            };
            checkVolume();
        } catch (e) {
            console.error("오디오 감지 실패:", e);
        }
    };

    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
                
                if (!audioTrack.enabled) {
                    setSpeakingUsers(prev => { const n = new Set(prev); n.delete(String(myUserId)); return n; });
                    if (stompClientRef.current?.connected) {
                        stompClientRef.current.publish({
                            destination: `/topic/workspace/${workspaceId}/webrtc`,
                            body: JSON.stringify({ type: 'SPEAKING', senderId: myUserId, workspaceId, data: false })
                        });
                    }
                }
            }
        }
    }, [myUserId, workspaceId]);

    const removePeer = useCallback((userId) => {
        if (peerConnectionsRef.current[userId]) {
            peerConnectionsRef.current[userId].close();
            delete peerConnectionsRef.current[userId];
        }
        setPeers(prev => {
            const newPeers = { ...prev };
            delete newPeers[userId];
            return newPeers;
        });
        setSpeakingUsers(prev => { const n = new Set(prev); n.delete(String(userId)); return n; });
    }, []);

    const leaveRoom = useCallback(() => {
        if (stompClientRef.current?.connected) {
            stompClientRef.current.publish({
                destination: `/topic/workspace/${workspaceId}/webrtc`,
                body: JSON.stringify({ type: 'LEAVE', senderId: myUserId, workspaceId })
            });
        }
        Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
        peerConnectionsRef.current = {};
        
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
        if (stompClientRef.current) stompClientRef.current.deactivate();
    }, [workspaceId, myUserId]);

    return { peers, isConnected, isMuted, toggleMute, speakingUsers, leaveRoom };
};