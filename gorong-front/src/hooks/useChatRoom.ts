// ============================================================
// 경로: src/hooks/useChatRoom.ts
//
// 변경 이력:
//  - 작성자 본인 확인 기능 추가 (isMyGroup / isAuthor)
//  - formatToLocalTime 디버그 로그 구조화 (개발 환경 한정)
//  - useCallback / useMemo 최적화
//  - WebSocket 구독 핸들 ref 관리 → 언마운트 시 메모리 누수 방지
//  - any 타입 제거, 원시 API 응답 전용 타입 정의
// ============================================================

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import SockJS from 'sockjs-client'
import Stomp, { Client, Subscription } from 'stompjs'
import { auth } from '../firebase/firebaseConfig'
import axiosInstance from '../api/axiosInstance'

// ────────────────────────────────────────────────────────────
// 상수
// ────────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://98.84.85.31:8080'

/** 미국 중부 표준시(CST, UTC-6) → 한국 표준시(KST, UTC+9) 시차 보정값 (시간 단위) */
const KST_OFFSET_HOURS = 15

// ────────────────────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────────────────────

/** 채팅 메시지 하나의 구조 */
export interface ChatMsg {
    user: string
    text: string
    sentAt?: string
    isMe?: boolean
}

/** 참여 중인 그룹 정보 */
export interface JoinedGroup {
    id: number
    title: string
    location: string
    currentCapacity: number
    maxCapacity: number
    status: string
    event?: string
    /** 작성자의 표시명 (닉네임, 없으면 이메일 폴백) */
    authorName?: string
    /** 작성자의 Firebase 이메일 — 권한 판정용 핵심 필드
     *  백엔드 GroupPost 엔티티의 author.email 이 그대로 직렬화되어 내려옵니다.
     *  없을 경우 authorName(이메일 폴백) 으로 보조 판정합니다. */
    authorEmail?: string
}

/**
 * 백엔드 /api/groups 가 반환하는 원시(raw) 응답 구조.
 * GroupPost 엔티티를 그대로 직렬화하므로 author 객체가 포함됩니다.
 */
interface RawGroupPost {
    id: number
    title: string
    location?: string
    currentCapacity?: number
    maxCapacity?: number
    status?: string
    event?: string
    authorName?: string          // @JsonProperty("authorName") → getAuthorName() 반환값
    author?: {
        id?: number
        email?: string             // Firebase 로그인 이메일
        firebaseUid?: string
    }
}

/**
 * 백엔드 /chat/{gid}/history 가 반환하는 원시 채팅 메시지 구조.
 * ChatMessageEntity 또는 ChatMessage DTO 의 직렬화 결과입니다.
 */
interface RawChatMessage {
    senderEmail?: string
    user?: string
    text?: string
    sentAt?: string | number[] | number | null
}

/** 웹소켓으로 실시간 수신하는 메시지 구조 */
interface RawSocketMessage {
    senderEmail?: string
    user?: string
    text?: string
    sentAt?: string | number[] | number | null
}

// ────────────────────────────────────────────────────────────
// 디버그 로거 (개발 환경에서만 출력)
// ────────────────────────────────────────────────────────────

/**
 * 개발 빌드에서만 console.log 를 출력하는 래퍼.
 * 프로덕션 빌드(import.meta.env.PROD) 에서는 아무것도 실행하지 않습니다.
 */
const debugLog = (label: string, ...args: unknown[]): void => {
    if (import.meta.env.DEV) {
        console.log(`[useChatRoom][${label}]`, ...args)
    }
}

// ────────────────────────────────────────────────────────────
// 시간 보정 유틸리티
// ────────────────────────────────────────────────────────────

/**
 * 백엔드(미국 중부 표준시)에서 내려온 날짜/시간 값을
 * 한국 표준시(KST)로 변환하여 "HH:mm" 형태로 반환합니다.
 *
 * [시차 디버깅 메모]
 * - 백엔드 서버: 미국 중부 표준시 (CST = UTC-6) 또는 중부 일광 절약시 (CDT = UTC-5)
 * - 프론트엔드: 한국 표준시 (KST = UTC+9)
 * - 시차: 15시간 (CDT 기준) ← KST_OFFSET_HOURS 상수로 관리
 *
 * [처리하는 입력 형태]
 *  1. "HH:mm"        → 이미 정제됨, 그대로 반환
 *  2. number[]       → LocalDateTime 배열 [year, month, day, hour, minute]
 *  3. "2026-05-26T01:14:00" 같은 ISO 문자열
 *  4. "01:14:00" 같은 시간 문자열
 */
const formatToLocalTime = (dateInput: string | number[] | number | null | undefined): string => {
    if (dateInput == null || dateInput === '') return ''

    try {
        const dateStr = String(dateInput).trim()

        // ── 케이스 1: 이미 "HH:mm" 형태 ──────────────────────────────
        if (/^\d{2}:\d{2}$/.test(dateStr)) {
            debugLog('formatToLocalTime', '이미 정제된 HH:mm 형식 → 그대로 반환', dateStr)
            return dateStr
        }

        let year = 2026, month = 5, day = 26, hours = 0, minutes = 0

        // ── 케이스 2: 배열 형태 [year, month, day, hour, minute] ──────
        if (Array.isArray(dateInput)) {
            const parts = dateInput as number[]
            year    = parts[0] ?? 2026
            month   = parts[1] ?? 5
            day     = parts[2] ?? 26
            hours   = parts[3] ?? 0
            minutes = parts[4] ?? 0
            debugLog('formatToLocalTime', '배열 형태 파싱', { year, month, day, hours, minutes })

        } else if (typeof dateStr === 'string' && dateStr.includes(',')) {
            // ── 케이스 2-b: 쉼표로 이어진 문자열 "2026,5,26,1,14" ──────
            const parts = dateStr.split(',').map(Number)
            year    = parts[0] ?? 2026
            month   = parts[1] ?? 5
            day     = parts[2] ?? 26
            hours   = parts[3] ?? 0
            minutes = parts[4] ?? 0
            debugLog('formatToLocalTime', '쉼표 문자열 파싱', { year, month, day, hours, minutes })

        } else {
            // ── 케이스 3/4: ISO 문자열 또는 시간 문자열 ──────────────────
            // 브라우저의 자동 UTC 해석을 막기 위해 정규식으로 숫자만 추출합니다.
            const matches = dateStr.match(/\d+/g)

            if (!matches) {
                debugLog('formatToLocalTime', '숫자 추출 실패 → 원문 반환', dateStr)
                return dateStr
            }

            if (matches.length >= 5) {
                // "2026-05-26T01:14:00" 형태
                year    = parseInt(matches[0], 10)
                month   = parseInt(matches[1], 10)
                day     = parseInt(matches[2], 10)
                hours   = parseInt(matches[3], 10)
                minutes = parseInt(matches[4], 10)
                debugLog('formatToLocalTime', 'ISO 문자열 파싱', { year, month, day, hours, minutes })

            } else if (matches.length >= 2) {
                // "01:14:00" 처럼 시간 데이터만 넘어온 경우
                hours   = parseInt(matches[0], 10)
                minutes = parseInt(matches[1], 10)
                debugLog('formatToLocalTime', '시간 전용 파싱', { hours, minutes })

            } else {
                debugLog('formatToLocalTime', '파싱 불가 → 원문 반환', dateStr)
                return dateStr
            }
        }

        // ── 핵심 보정: 미국 → 한국 시차 +KST_OFFSET_HOURS 적용 ────────
        // Date 생성자에 '로컬 시간' 숫자를 직접 넘겨서 브라우저 UTC 변환을 우회합니다.
        const localDate = new Date(year, month - 1, day, hours + KST_OFFSET_HOURS, minutes)

        const finalHours   = String(localDate.getHours()).padStart(2, '0')
        const finalMinutes = String(localDate.getMinutes()).padStart(2, '0')
        const result       = `${finalHours}:${finalMinutes}`

        debugLog('formatToLocalTime', `원본 ${hours}:${String(minutes).padStart(2,'0')} → 보정 후 KST ${result}`)

        return result

    } catch (e) {
        debugLog('formatToLocalTime', '변환 중 예외 발생', e)
        return String(dateInput)
    }
}

// ────────────────────────────────────────────────────────────
// 메인 훅
// ────────────────────────────────────────────────────────────

/**
 * useChatRoom
 *
 * 채팅방 웹소켓 연결, 메시지 관리, 작성자 권한 판정을 담당하는 커스텀 훅입니다.
 *
 * @returns
 *  - messages         : 현재 채팅 메시지 목록
 *  - isConnecting     : 연결 진행 중 여부
 *  - isConnected      : 연결 완료 여부
 *  - currentUserEmail : 현재 로그인한 유저의 이메일
 *  - connect          : 특정 그룹 채팅방에 연결
 *  - sendMessage      : 메시지 전송
 *  - isMyGroup        : 현재 유저가 해당 그룹의 작성자인지 판정
 */
export function useChatRoom() {
    const [messages, setMessages]       = useState<ChatMsg[]>([])
    const [isConnecting, setIsConnecting] = useState(false)
    const [isConnected, setIsConnected]   = useState(false)

    // ── 웹소켓 관련 ref ─────────────────────────────────────────
    /** STOMP 클라이언트 인스턴스 */
    const stompClientRef = useRef<Client | null>(null)
    /** 현재 구독 중인 채널 핸들 — 언마운트 시 명시적 unsubscribe 에 필요 */
    const subscriptionRef = useRef<Subscription | null>(null)
    /** 현재 연결된 그룹 ID */
    const connectedGroupIdRef = useRef<number | null>(null)

    // ── 현재 로그인 유저 이메일 ────────────────────────────────────
    /**
     * useMemo 로 memoize:
     * auth.currentUser 는 Firebase 내부 상태이며 React 렌더 사이클 밖에서 관리되므로,
     * 훅 최초 실행 시점의 값을 캡처합니다.
     * 로그아웃/재로그인 시 컴포넌트 자체가 언마운트-리마운트되므로 실질적으로 안전합니다.
     */
    const currentUserEmail = useMemo(() => auth.currentUser?.email ?? '', [])

    // ────────────────────────────────────────────────────────────
    // 작성자 권한 판정 헬퍼
    // ────────────────────────────────────────────────────────────

    /**
     * 현재 로그인 유저가 해당 그룹(또는 게시글)의 작성자인지 판정합니다.
     *
     * [판정 우선순위]
     *  1. group.authorEmail 이 있으면 → currentUserEmail 과 직접 비교 (정확)
     *  2. group.authorName  이 있으면 → currentUserEmail 과 비교 (닉네임 사용 시 false 가능)
     *
     * [사용 예시 — Chat.tsx 또는 GroupDetailPage.tsx]
     * ```tsx
     * const { isMyGroup } = useChatRoom()
     * // ...
     * {isMyGroup(activeGroup) && (
     *   <button onClick={handleEdit}>수정</button>
     * )}
     * ```
     *
     * [권고 사항]
     * 백엔드 GroupController.getAllGroups() 가 authorEmail 필드를 응답에 포함하면
     * 닉네임 불일치 문제 없이 정확하게 판정할 수 있습니다.
     * 현재는 GroupPost 엔티티가 author 객체를 그대로 직렬화하므로,
     * fetchJoinedGroups() 내부에서 g.author?.email 로 추출하고 있습니다.
     */
    const isMyGroup = useCallback((group: JoinedGroup | null | undefined): boolean => {
        if (!group || !currentUserEmail) return false

        // 1순위: authorEmail (백엔드 author.email 직접 매핑)
        if (group.authorEmail) {
            return group.authorEmail === currentUserEmail
        }

        // 2순위: authorName (닉네임이 없을 때 이메일을 폴백으로 내려주는 백엔드 로직 이용)
        //         닉네임이 설정된 유저는 authorName 이 닉네임이므로 불일치할 수 있습니다.
        if (group.authorName) {
            return group.authorName === currentUserEmail
        }

        return false
    }, [currentUserEmail])

    // ────────────────────────────────────────────────────────────
    // 과거 채팅 기록 로드
    // ────────────────────────────────────────────────────────────

    const loadChatHistory = useCallback(async (gid: number): Promise<ChatMsg[]> => {
        try {
            const res = await axiosInstance.get<RawChatMessage[]>(`/chat/${gid}/history`)
            const myEmail = auth.currentUser?.email ?? ''

            return res.data.map((m) => {
                const senderIdentifier = m.senderEmail || m.user || ''
                const isMe = Boolean(senderIdentifier && senderIdentifier === myEmail)

                return {
                    user:   m.senderEmail || m.user || '익명',
                    text:   m.text ?? '',
                    sentAt: formatToLocalTime(m.sentAt ?? null), // ✅ 히스토리 KST 보정
                    isMe,
                }
            })
        } catch (e) {
            debugLog('loadChatHistory', '히스토리 로드 실패', e)
            return []
        }
    }, []) // formatToLocalTime 은 순수 함수(모듈 스코프)이므로 의존성 불필요

    // ────────────────────────────────────────────────────────────
    // 내부 정리 헬퍼 — 구독 해제 → 연결 해제
    // ────────────────────────────────────────────────────────────

    /**
     * 웹소켓 구독과 연결을 순서대로 안전하게 정리합니다.
     * disconnect() 전에 반드시 unsubscribe() 를 먼저 호출해야
     * STOMP 프레임 순서가 올바르게 유지됩니다.
     */
    const cleanupConnection = useCallback(() => {
        // 1. 구독 채널 먼저 해제
        if (subscriptionRef.current) {
            try {
                subscriptionRef.current.unsubscribe()
                debugLog('cleanupConnection', '구독 해제 완료')
            } catch (e) {
                debugLog('cleanupConnection', '구독 해제 중 오류 (무시)', e)
            }
            subscriptionRef.current = null
        }

        // 2. STOMP 연결 해제
        if (stompClientRef.current) {
            try {
                stompClientRef.current.disconnect(() => {
                    debugLog('cleanupConnection', 'STOMP 연결 해제 완료')
                })
            } catch (e) {
                debugLog('cleanupConnection', 'STOMP disconnect 중 오류 (무시)', e)
            }
            stompClientRef.current = null
        }

        connectedGroupIdRef.current = null
        setIsConnected(false)
    }, [])

    // ────────────────────────────────────────────────────────────
    // 웹소켓 연결 및 방 입장
    // ────────────────────────────────────────────────────────────

    /**
     * 지정한 그룹 채팅방에 웹소켓으로 연결합니다.
     * 이미 같은 방에 연결되어 있으면 중복 연결을 방지합니다.
     * 다른 방에 연결되어 있으면 기존 연결을 먼저 정리합니다.
     */
    const connect = useCallback(async (gid: number, groupTitle: string) => {
        // 동일 방 중복 연결 방지
        if (connectedGroupIdRef.current === gid) return

        // 기존 연결이 있으면 정리 후 재연결
        cleanupConnection()
        setIsConnecting(true)
        setIsConnected(false)
        connectedGroupIdRef.current = gid

        // 과거 채팅 기록 먼저 표시
        const history = await loadChatHistory(gid)
        setMessages([
            { user: '시스템', text: `[${groupTitle}] 채팅방에 입장했습니다.` },
            ...history,
        ])

        // Firebase 토큰 취득
        const token = await auth.currentUser?.getIdToken()
        if (!token) {
            debugLog('connect', 'Firebase 토큰 없음 → 연결 중단')
            setIsConnecting(false)
            return
        }

        const socket = new SockJS(`${API_BASE_URL}/ws-chat`)
        const client: Client = Stomp.over(socket)
        // STOMP 내부 디버그 로그 비활성화 (프로덕션 노이즈 방지)
        client.debug = () => {}

        // STOMP 연결 성공 콜백
        client.connect(
            { Authorization: `Bearer ${token}` },
            () => {
                stompClientRef.current = client
                setIsConnecting(false)
                setIsConnected(true)
                debugLog('connect', `그룹 ${gid} 연결 성공`)

                // 실시간 메시지 구독 — 구독 핸들을 ref 에 저장해 나중에 해제 가능하게 합니다.
                subscriptionRef.current = client.subscribe(
                    `/topic/group/${gid}`,
                    (frame) => {
                        const received: RawSocketMessage = JSON.parse(frame.body)
                        const myEmail = auth.currentUser?.email ?? ''

                        const senderIdentifier = received.senderEmail || received.user || ''
                        const isMe = Boolean(senderIdentifier && senderIdentifier === myEmail)

                        setMessages(prev => [...prev, {
                            user:   received.senderEmail || received.user || '익명',
                            text:   received.text ?? '',
                            sentAt: formatToLocalTime(received.sentAt ?? null), // ✅ 실시간 메시지 KST 보정
                            isMe,
                        }])
                    }
                )
            },
            // STOMP 연결 실패 콜백
            (error) => {
                debugLog('connect', 'STOMP 연결 실패', error)
                setIsConnecting(false)
                setIsConnected(false)
                stompClientRef.current = null
                connectedGroupIdRef.current = null
            }
        )
    }, [cleanupConnection, loadChatHistory])

    // ────────────────────────────────────────────────────────────
    // 메시지 전송
    // ────────────────────────────────────────────────────────────

    /**
     * 현재 연결된 채팅방으로 메시지를 전송합니다.
     * 빈 문자열, 연결 없음, 방 미지정 상태에서는 전송하지 않습니다.
     */
    const sendMessage = useCallback((text: string) => {
        const gid = connectedGroupIdRef.current
        if (!text.trim() || !stompClientRef.current || !gid) return

        const senderEmail = auth.currentUser?.email ?? '익명'
        stompClientRef.current.send(
            `/app/chat.sendMessage/${gid}`,
            {},
            JSON.stringify({ roomId: String(gid), user: senderEmail, senderEmail, text })
        )
    }, [])

    // ────────────────────────────────────────────────────────────
    // 언마운트 시 완전 정리 (메모리 누수 방지)
    // ────────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            debugLog('useEffect cleanup', '컴포넌트 언마운트 → 웹소켓 정리')
            cleanupConnection()
        }
    }, [cleanupConnection])

    // ── 반환값 ──────────────────────────────────────────────────
    return {
        /** 현재 채팅 메시지 목록 */
        messages,
        /** 웹소켓 연결 진행 중 여부 */
        isConnecting,
        /** 웹소켓 연결 완료 여부 */
        isConnected,
        /** 현재 로그인한 유저의 이메일 (권한 판정 UI 에서 활용 가능) */
        currentUserEmail,
        /** 특정 그룹 채팅방에 연결 */
        connect,
        /** 메시지 전송 */
        sendMessage,
        /**
         * 현재 로그인 유저가 해당 그룹의 작성자인지 판정합니다.
         * 수정/삭제 버튼의 표시 여부 제어에 사용하세요.
         *
         * @example
         * {isMyGroup(activeGroup) && <button onClick={handleDelete}>삭제</button>}
         */
        isMyGroup,
    }
}

// ────────────────────────────────────────────────────────────
// 참여 중인 그룹 목록 가져오기
// ────────────────────────────────────────────────────────────

/**
 * 현재 로그인 유저가 참여 중인 그룹 목록을 가져옵니다.
 *
 * [권한 판정용 authorEmail 추출 전략]
 * 백엔드 GroupPost 엔티티는 author 객체를 그대로 직렬화하므로
 * g.author?.email 에서 Firebase 이메일을 직접 추출할 수 있습니다.
 * 만약 향후 백엔드가 author 를 @JsonIgnore 처리하면,
 * GroupController 에 별도 authorEmail 필드를 추가해야 합니다.
 */
export async function fetchJoinedGroups(): Promise<JoinedGroup[]> {
    try {
        const [idsRes, groupsRes] = await Promise.all([
            axiosInstance.get<number[]>('/groups/joined-ids'),
            axiosInstance.get<RawGroupPost[]>('/groups'),
        ])

        const joinedIds: number[] = idsRes.data

        return groupsRes.data
            .filter((g) => joinedIds.includes(g.id))
            .map((g): JoinedGroup => ({
                id:              g.id,
                title:           g.title,
                location:        g.location ?? '',
                currentCapacity: g.currentCapacity ?? 0,
                maxCapacity:     g.maxCapacity ?? 0,
                status:          g.status ?? 'RECRUITING',
                event:           g.event,
                authorName:      g.authorName,
                // ✅ 권한 판정용: 백엔드 author 객체에서 이메일 직접 추출
                authorEmail:     g.author?.email,
            }))
    } catch (e) {
        debugLog('fetchJoinedGroups', '그룹 목록 로드 실패', e)
        return []
    }
}