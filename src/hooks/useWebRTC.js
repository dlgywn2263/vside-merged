// src/hooks/useWebRTC.js
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
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8080';

    useEffect(() => {
        if (!workspaceId || !myUserId) return;
        let isCancelled = false; 

        const initWebRTC = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
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
                                    destination: `/app/webrtc/${workspaceId}`,
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
                console.log(`⏳ [WebRTC] 유저${userId}의 밀린 ICE 데이터 ${iceQueueRef.current[userId].length}개 처리 시작!`);
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
                console.log(`🎵 유저${remoteUserId}의 오디오 수신 성공!`);
                setPeers(prev => ({ ...prev, [remoteUserId]: event.streams[0] }));
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) sendSignalingMessage('ICE', remoteUserId, event.candidate);
            };

            pc.onconnectionstatechange = () => {
                console.log(`🔌 유저${remoteUserId} 와의 P2P 연결 상태:`, pc.connectionState);
            };
        };

        const sendSignalingMessage = (type, receiverId, data) => {
            if (stompClientRef.current?.connected) {
                stompClientRef.current.publish({
                    destination: `/app/webrtc/${workspaceId}`,
                    body: JSON.stringify({ type, senderId: myUserId, receiverId, workspaceId, data })
                });
            }
        };

        initWebRTC();
        
        return () => {
            isCancelled = true;
            leaveRoom();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, myUserId]);

    const monitorLocalAudio = (stream) => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.4;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const unlockAudio = () => {
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume().catch(()=>{});
                }
                window.removeEventListener('click', unlockAudio, { capture: true });
                window.removeEventListener('keydown', unlockAudio, { capture: true });
            };
            window.addEventListener('click', unlockAudio, { capture: true });
            window.addEventListener('keydown', unlockAudio, { capture: true });

            const checkVolume = () => {
                if (audioCtx.state === 'closed') return;
                if (audioCtx.state === 'suspended') {
                    requestAnimationFrame(checkVolume);
                    return;
                }
                
                analyser.getByteTimeDomainData(dataArray);
                let sumSquares = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    let norm = (dataArray[i] / 128.0) - 1.0;
                    sumSquares += norm * norm;
                }
                let rms = Math.sqrt(sumSquares / dataArray.length);
                let volume = rms * 100; 

                let isSpeakingNow = volume > 0.5;

                if (isSpeakingNow !== localSpeakingRef.current) {
                    localSpeakingRef.current = isSpeakingNow;
                    
                    setSpeakingUsers(prev => {
                        const currentList = Array.from(prev);
                        if (isSpeakingNow) {
                            if (!currentList.includes(String(myUserId))) currentList.push(String(myUserId));
                        } else {
                            const index = currentList.indexOf(String(myUserId));
                            if (index > -1) currentList.splice(index, 1);
                        }
                        return new Set(currentList);
                    });
                    
                    if (stompClientRef.current?.connected) {
                        stompClientRef.current.publish({
                            destination: `/app/webrtc/${workspaceId}`,
                            body: JSON.stringify({ type: 'SPEAKING', senderId: myUserId, workspaceId, data: isSpeakingNow })
                        });
                    }
                }
                requestAnimationFrame(checkVolume);
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
                            destination: `/app/webrtc/${workspaceId}`,
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
                destination: `/app/webrtc/${workspaceId}`,
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