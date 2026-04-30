"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';

export const useWebRTC = (workspaceId, myUserId) => {
    const [peers, setPeers] = useState({});
    const [isMuted, setIsMuted] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [speakingUsers, setSpeakingUsers] = useState(new Set()); 
    const [micVolume, setMicVolumeState] = useState(1.0);

    const rawStreamRef = useRef(null);
    const localStreamRef = useRef(null);
    const gainNodeRef = useRef(null);
    const audioCtxRef = useRef(null); // 💡 [핵심 해결] 메모리 청소를 위해 컨텍스트 저장
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
                const rawStream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { 
                        echoCancellation: false,   
                        noiseSuppression: false,   
                        autoGainControl: false,    
                        googAutoGainControl: false, 
                        googEchoCancellation: false,
                        googNoiseSuppression: false,
                        googHighpassFilter: false,
                        sampleRate: 48000,
                        channelCount: 1
                    }, 
                    video: false 
                });
                
                if (isCancelled) {
                    rawStream.getTracks().forEach(track => track.stop());
                    return;
                }

                rawStreamRef.current = rawStream;

                // 💡 [안전장치 추가]
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                audioCtxRef.current = audioCtx;
                
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume().catch(e => console.warn("오디오 컨텍스트 켜기 차단됨:", e));
                }

                const source = audioCtx.createMediaStreamSource(rawStream);
                const gainNode = audioCtx.createGain();
                gainNode.gain.value = 1.0; 
                gainNodeRef.current = gainNode;

                const destination = audioCtx.createMediaStreamDestination();

                source.connect(gainNode);
                gainNode.connect(destination);

                const processedStream = destination.stream;
                localStreamRef.current = processedStream;

                monitorLocalAudio(audioCtx, gainNode);

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

    const monitorLocalAudio = (audioCtx, sourceNode) => {
        try {
            const analyser = audioCtx.createAnalyser();
            sourceNode.connect(analyser);
            
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
                const currentlyMuted = rawStreamRef.current?.getAudioTracks()[0]?.enabled === false;

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

    const changeMicVolume = useCallback((volume) => {
        try {
            const safeVolume = isNaN(volume) ? 1.0 : volume; // 💡 [안전장치]
            if (gainNodeRef.current && gainNodeRef.current.context.state !== 'closed') {
                gainNodeRef.current.gain.setTargetAtTime(safeVolume, gainNodeRef.current.context.currentTime, 0.1);
                setMicVolumeState(safeVolume);
            }
        } catch (e) {
            console.error("마이크 볼륨 조절 에러:", e);
        }
    }, []);

    const toggleMute = useCallback(() => {
        if (rawStreamRef.current) {
            const audioTrack = rawStreamRef.current.getAudioTracks()[0];
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
        
        if (rawStreamRef.current) rawStreamRef.current.getTracks().forEach(track => track.stop());
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
        if (stompClientRef.current) stompClientRef.current.deactivate();

        // 💡 [핵심 해결] 통화를 끊을 때 메모리에 쌓인 오디오 컨텍스트 찌꺼기를 완벽히 파괴합니다!
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close().catch(()=>{});
        }
    }, [workspaceId, myUserId]);

    return { peers, isConnected, isMuted, toggleMute, speakingUsers, leaveRoom, micVolume, changeMicVolume };
};