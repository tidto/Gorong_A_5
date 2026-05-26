// 경로: src/hooks/useChatRoom.ts
import { useState, useRef, useCallback, useEffect } from 'react'
import SockJS from 'sockjs-client'
import Stomp from 'stompjs'
import { auth } from '../firebase/firebaseConfig'
import axiosInstance from '../api/axiosInstance'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://98.84.85.31:8080'

export interface ChatMsg {
    user: string
    text: string
    sentAt?: string
    isMe?: boolean
}

export interface JoinedGroup {
    id: number
    title: string
    location: string
    currentCapacity: number
    maxCapacity: number
    status: string
    event?: string
    authorName?: string
}

// ✅ 브라우저의 타임존 왜곡을 원천 차단하고 무조건 한국 시간(HH:mm)으로 변환하는 함수
const formatToLocalTime = (dateInput: any) => {
    if (!dateInput) return '';

    try {
        let dateStr = String(dateInput).trim();

        // 1. 이미 정제된 "16:14" 형태의 문자열이 들어오면 그대로 반환
        if (/^\d{2}:\d{2}$/.test(dateStr)) {
            return dateStr;
        }

        let year = 2026, month = 5, day = 26, hours = 0, minutes = 0;

        // 2. 백엔드에서 LocalDateTime이 배열 형태로 올 경우 대응 ([2026, 5, 26, 1, 14])
        if (Array.isArray(dateInput) || dateStr.includes(',')) {
            const parts = Array.isArray(dateInput) ? dateInput : dateStr.split(',').map(Number);
            year = parts[0] || 2026;
            month = parts[1] || 5;
            day = parts[2] || 26;
            hours = parts[3] || 0;
            minutes = parts[4] || 0;
        } else {
            // 3. 문자열 포맷일 경우 ("2026-05-26T01:14:00" 등)
            // 브라우저의 자동 UTC 해석을 막기 위해 숫자만 순서대로 강제 추출합니다.
            const matches = dateStr.match(/\d+/g);
            if (matches && matches.length >= 5) {
                year = parseInt(matches[0], 10);
                month = parseInt(matches[1], 10);
                day = parseInt(matches[2], 10);
                hours = parseInt(matches[3], 10);
                minutes = parseInt(matches[4], 10);
            } else if (matches && matches.length >= 2) {
                // "01:14:00" 처럼 시간 데이터만 넘어온 경우
                hours = parseInt(matches[0], 10);
                minutes = parseInt(matches[1], 10);
            } else {
                return dateStr;
            }
        }

        // 4. ⭐️ 핵심 해결책: 문자열 통째로 Date에 넣지 않고, 추출한 '숫자'들을 이용해
        // 로컬 기준 Date 객체를 생성하면서 미국-한국 시차인 15시간을 정확히 더해줍니다.
        const localDate = new Date(year, month - 1, day, hours + 15, minutes);

        // 5. 최종 시/분 추출하여 "16:14" 형태로 고정
        const finalHours = String(localDate.getHours()).padStart(2, '0');
        const finalMinutes = String(localDate.getMinutes()).padStart(2, '0');

        return `${finalHours}:${finalMinutes}`;
    } catch {
        return String(dateInput);
    }
}

export function useChatRoom() {
    const [messages, setMessages] = useState<ChatMsg[]>([])
    const [isConnecting, setIsConnecting] = useState(false)
    const [isConnected, setIsConnected] = useState(false)
    const stompClientRef = useRef<any>(null)
    const connectedGroupIdRef = useRef<number | null>(null)

    // 과거 채팅 기록 로드
    const loadChatHistory = useCallback(async (gid: number): Promise<ChatMsg[]> => {
        try {
            const res = await axiosInstance.get(`/chat/${gid}/history`)
            const myEmail = auth.currentUser?.email || ''

            return res.data.map((m: any) => {
                const senderIdentifier = m.senderEmail || m.user || '';
                const isMe = senderIdentifier === myEmail;

                return {
                    user: m.senderEmail || m.user || '익명',
                    text: m.text,
                    sentAt: formatToLocalTime(m.sentAt), // ✅ 히스토리 불러올 때 수동 시차 보정 적용
                    isMe: isMe,
                }
            })
        } catch {
            return []
        }
    }, [])

    // 웹소켓 연결 및 방 입장
    const connect = useCallback(async (gid: number, groupTitle: string) => {
        if (connectedGroupIdRef.current === gid) return

        if (stompClientRef.current) {
            try { stompClientRef.current.disconnect() } catch {}
            stompClientRef.current = null
        }

        setIsConnecting(true)
        setIsConnected(false)
        connectedGroupIdRef.current = gid

        const history = await loadChatHistory(gid)
        setMessages([
            { user: '시스템', text: `[${groupTitle}] 채팅방에 입장했습니다.` },
            ...history,
        ])

        const token = await auth.currentUser?.getIdToken()
        const socket = new SockJS(`${API_BASE_URL}/ws-chat`)
        const client = Stomp.over(socket)
        client.debug = () => {}

        client.connect({ Authorization: `Bearer ${token}` }, () => {
            stompClientRef.current = client
            setIsConnecting(false)
            setIsConnected(true)

            // 실시간 메시지 구독(수신)
            client.subscribe(`/topic/group/${gid}`, (message) => {
                const received = JSON.parse(message.body)
                const myEmail = auth.currentUser?.email || ''

                const senderIdentifier = received.senderEmail || received.user || '';
                const isMe = senderIdentifier === myEmail;

                setMessages(prev => [...prev, {
                    user: received.senderEmail || received.user || '익명',
                    text: received.text,
                    sentAt: formatToLocalTime(received.sentAt),
                    isMe: isMe,
                }])
            })
        }, () => {
            setIsConnecting(false)
            setIsConnected(false)
        })
    }, [loadChatHistory])

    // 메시지 전송
    const sendMessage = useCallback((text: string) => {
        const gid = connectedGroupIdRef.current
        if (!text.trim() || !stompClientRef.current || !gid) return
        const senderEmail = auth.currentUser?.email || '익명'
        stompClientRef.current.send(
            `/app/chat.sendMessage/${gid}`,
            {},
            JSON.stringify({ roomId: String(gid), user: senderEmail, senderEmail, text })
        )
    }, [])

    // 언마운트 시 소켓 연결 해제
    useEffect(() => {
        return () => {
            if (stompClientRef.current) {
                try { stompClientRef.current.disconnect() } catch {}
            }
        }
    }, [])

    return { messages, isConnecting, isConnected, connect, sendMessage }
}

// 참여중인 그룹 목록 가져오기 함수
export async function fetchJoinedGroups(): Promise<JoinedGroup[]> {
    try {
        const [idsRes, groupsRes] = await Promise.all([
            axiosInstance.get('/groups/joined-ids'),
            axiosInstance.get('/groups'),
        ])
        const joinedIds: number[] = idsRes.data
        return groupsRes.data.filter((g: JoinedGroup) => joinedIds.includes(g.id))
    } catch {
        return []
    }
}