// ──────────────────────────────────────────────────────────────
// ChatScreen.tsx — 현장 채팅 화면
//
// 채팅 화면
// ──────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import * as Location from 'expo-location'
import { useChat } from '../hooks/useChat'
import { useGroupChat } from '../hooks/useGroupChat'
import { useAuthStore } from '../store/authStore'
import { auth } from '../config/firebaseConfig'
import { AppGroup } from '../types'
import { fetchAppGroups } from '../services/api'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ensureGroupRoom,
  markGroupGathered,
  shareLocation,
  subscribeGroupLocations,
  subscribeGroupRoom,
} from '../services/firestore'

type ChatScreenMessage = {
  id: string
  user: string
  nickname: string
  userId: string
  isMe: boolean
  text: string
  sentAt?: string | number
}

function formatMessageTime(value?: string | number) {
  if (value == null) return ''
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const time = value.trim()
  const clockTime = time.match(/^(\d{1,2}):(\d{2})/)
  if (clockTime) return `${clockTime[1].padStart(2, '0')}:${clockTime[2]}`

  const date = new Date(time)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function ChatScreen() {
  const [mode, setMode] = useState<'anonymous' | 'group'>('anonymous')
  const [input, setInput] = useState('')
  const [groupMembers, setGroupMembers] = useState<string[]>([])
  const [groupGathered, setGroupGathered] = useState(false)
  const [sharedCount, setSharedCount] = useState(0)
  const [sharedLocs, setSharedLocs] = useState<Record<string, { lat: number; lng: number }>>({})
  const [verifyMessage, setVerifyMessage] = useState('')
  const [joinedGroups, setJoinedGroups] = useState<AppGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [isGroupChatOpen, setIsGroupChatOpen] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [groupRoomReady, setGroupRoomReady] = useState(false)
  const [groupRoomClosedAt, setGroupRoomClosedAt] = useState<number | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const groupMessageListRef = useRef<FlatList<ChatScreenMessage>>(null)

  // [수정] 방 준비 실패 상태 별도 추적 → 재시도 버튼 노출용

  const insets = useSafeAreaInsets()
  const navigation = useNavigation<any>()
  const { insideVenueId } = useAuthStore()
  const myUid = auth.currentUser?.uid ?? null

  const { messages, sendMessage, isConnected } = useChat(insideVenueId)

  const selectedGroup = useMemo(
      () => joinedGroups.find((group) => String(group.id) === selectedGroupId) ?? null,
      [joinedGroups, selectedGroupId]
  )

  const {
    messages: groupMessages,
    isConnected: isGroupChatConnected,
    isLoading: isGroupChatLoading,
    error: groupChatError,
    sendMessage: sendGroupChatMessage,
    retry: retryGroupChat,
  } = useGroupChat(selectedGroup?.id ?? null, mode === 'group' && isGroupChatOpen)

  const isGroupRoomClosed = Boolean(
      (selectedGroup && isGroupListingClosed(selectedGroup)) ||
      (groupRoomClosedAt && Date.now() > groupRoomClosedAt)
  )

  const canSendAnonymousMessage = mode === 'anonymous' && isConnected
  const canSendGroupMessage = Boolean(selectedGroup && isGroupChatConnected && !isGroupRoomClosed)

  useEffect(() => {
    if (!isGroupChatOpen || groupMessages.length === 0) return
    const timer = setTimeout(() => groupMessageListRef.current?.scrollToEnd({ animated: true }), 80)
    return () => clearTimeout(timer)
  }, [groupMessages.length, isGroupChatOpen])

  useEffect(() => {
    navigation.setOptions({ tabBarStyle: isGroupChatOpen ? { display: 'none' } : undefined })
    return () => navigation.setOptions({ tabBarStyle: undefined })
  }, [isGroupChatOpen, navigation])

  useEffect(() => {
    if (mode !== 'group' || !isGroupChatOpen) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsGroupChatOpen(false)
      setShowGroupInfo(false)
      return true
    })
    return () => subscription.remove()
  }, [isGroupChatOpen, mode])

  function parseChatDate(value?: string | null) {
    if (!value) return null
    const parts = value.split('-').map(Number)
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      return new Date(parts[0], parts[1] - 1, parts[2])
    }
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  // 만남 다음날이 지나면 이전 모임 기록만 볼 수 있도록 채팅방을 읽기 전용 처리합니다.
  function isGroupListingClosed(group: AppGroup) {
    const meetingDate = parseChatDate(group.meetingDate)
    if (!meetingDate) return false
    const expireAt = new Date(meetingDate)
    expireAt.setDate(expireAt.getDate() + 1)  // 다음날까지
    expireAt.setHours(23, 59, 59, 999)
    return Date.now() > expireAt.getTime()
  }

  const waitForAuthReady = async () => {
    if (auth.currentUser) return true
    return new Promise<boolean>((resolve) => {
      const unsub = auth.onAuthStateChanged((u) => {
        if (u) { unsub(); resolve(true) }
      })
      setTimeout(() => { unsub(); resolve(false) }, 3000)
    })
  }

  // ── 참여 모임 목록 로드 ─────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      setLoadingGroups(true)
      try {
        const ready = await waitForAuthReady()
        if (!ready) throw new Error('로그인 정보를 확인할 수 없습니다.')
        const response = await fetchAppGroups()
        const groups = response.data.filter((group) => group.joined)
        setJoinedGroups(groups)
        setSelectedGroupId((current) => {
          if (current && groups.some((g) => String(g.id) === current)) return current
          return null
        })
      } catch (error) {
        console.error('[ChatScreen] 모임 목록 조회 실패:', error)
        Alert.alert('오류', '참여 중인 모임 목록을 불러오지 못했습니다.')
      } finally {
        setLoadingGroups(false)
      }
    })()
  }, [])

  // ── 선택된 모임 채팅방 구독 ────────────────────────────────
  useEffect(() => {
    if (!isGroupChatOpen || !selectedGroup || !myUid) {
      setGroupRoomReady(false)
      setGroupRoomClosedAt(null)
      setGroupMembers([])
      setGroupGathered(false)
      setSharedLocs({})
      setSharedCount(0)
      setVerifyMessage('')
      return
    }

    setSharedLocs({})
    setSharedCount(0)
    setVerifyMessage('')

    // 지난 모임은 서버 채팅 이력을 열람할 수 있도록 두되,
    // Firestore 방을 다시 준비해 종료된 채팅방을 실수로 열지 않습니다.
    if (isGroupListingClosed(selectedGroup)) {
      setGroupRoomReady(false)
      setGroupRoomClosedAt(null)
      setGroupMembers([])
      setGroupGathered(false)
      return
    }

    let unsubLoc: (() => void) | null = null
    let unsubRoom: (() => void) | null = null
    let cancelled = false

    const groupId = String(selectedGroup.id)
    unsubLoc = subscribeGroupLocations(groupId, (locs) => {
      setSharedLocs(locs)
      setSharedCount(Object.keys(locs).length)
    })
    unsubRoom = subscribeGroupRoom(groupId, (room) => {
      setGroupMembers(room?.members ?? [])
      setGroupGathered(Boolean(room?.isGathered))
      setGroupRoomClosedAt(room?.closedAt ?? null)
      setGroupRoomReady(true)
    })
    setGroupRoomReady(true)

    ;(async () => {
      try {
        await ensureGroupRoom(selectedGroup, myUid)
      } catch (error) {
        if (cancelled) return
        console.error('[ChatScreen] 모임 룸 생성 실패:', error)
        setVerifyMessage('모임 채팅방 생성에 실패했습니다. 채팅은 계속 사용할 수 있습니다.')
      }
    })()

    return () => {
      cancelled = true
      unsubLoc?.()
      unsubRoom?.()
    }
  }, [isGroupChatOpen, selectedGroup, myUid])

  // ── [수정] 재시도 함수 ────────────────────────────────────
  const handleRetryRoomPrep = async () => {
    if (!selectedGroup || !myUid || isGroupListingClosed(selectedGroup)) return
    setVerifyMessage('')
    try {
      await ensureGroupRoom(selectedGroup, myUid)
      setGroupRoomReady(true)
      retryGroupChat()
    } catch (err) {
      setVerifyMessage('재시도 실패. 네트워크를 확인해 주세요.')
    }
  }

  const visibleMessages = useMemo<ChatScreenMessage[]>(() => {
    if (mode === 'anonymous') {
      return messages.map((message) => ({
        id: message.id,
        user: message.nickname || '익명',
        nickname: message.nickname || '익명',
        userId: message.userId,
        isMe: message.userId === myUid,
        text: message.text,
        sentAt: message.createdAt,
      }))
    }
    return groupMessages.map((message) => ({
      id: message.id,
      user: message.user,
      nickname: message.user,
      userId: message.senderEmail ?? '',
      isMe: message.isMe,
      text: message.text,
      sentAt: message.sentAt,
    }))
  }, [mode, messages, groupMessages, myUid])

  const getDistanceMeters = (
      a: { lat: number; lng: number },
      b: { lat: number; lng: number }
  ) => {
    const R = 6371000
    const dLat = (b.lat - a.lat) * Math.PI / 180
    const dLon = (b.lng - a.lng) * Math.PI / 180
    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(a.lat * Math.PI / 180) *
        Math.cos(b.lat * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  }

  const handleShareLocation = async () => {
    if (!selectedGroup || !groupRoomReady || !myUid || isGroupRoomClosed) return
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('위치 권한 필요', '위치 공유를 사용하려면 위치 권한이 필요합니다.')
      return
    }
    try {
      const loc = await Location.getCurrentPositionAsync({})
      await shareLocation(String(selectedGroup.id), myUid, loc.coords.latitude, loc.coords.longitude)
      // 5초 후 자동 삭제는 firestore.ts에서 처리
    } catch (err) {
      Alert.alert('오류', '위치 공유에 실패했습니다.')
    }
  }

  const handleVerifyGathering = async () => {
    if (!selectedGroup || !groupRoomReady) return
    if (groupMembers.length < 2) {
      setVerifyMessage('2명 이상인 모임만 성사 인증이 가능합니다.')
      return
    }
    const missing = groupMembers.filter((id) => !sharedLocs[id])
    if (missing.length > 0) {
      setVerifyMessage(`위치 공유 없는 인원 ${missing.length}명. 모두 위치 공유 후 시도하세요.`)
      return
    }
    const points = groupMembers.map((id) => sharedLocs[id])
    let maxDist = 0
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        maxDist = Math.max(maxDist, getDistanceMeters(points[i], points[j]))
      }
    }
    if (maxDist <= 70) {
      await markGroupGathered(String(selectedGroup.id))
      setVerifyMessage(`✅ 모임 성사! 최대 ${Math.round(maxDist)}m 이내`)
    } else {
      setVerifyMessage(`❌ 인증 실패: 최대 거리 ${Math.round(maxDist)}m (기준 70m)`)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !myUid) return

    let sent = false
    try {
      if (mode === 'anonymous') {
        await sendMessage(text)
        sent = true
      } else if (selectedGroup && !isGroupRoomClosed) {
        sendGroupChatMessage(text)
        sent = true
      }
    } catch (error) {
      console.error('[ChatScreen] 메시지 전송 실패:', error)
      Alert.alert('안내', '메시지 전송에 실패했습니다.')
    } finally {
      if (sent) setInput('')
    }
  }

  // ── [수정] 입력창 placeholder 정확한 상태 분기 ────────────
  const getInputPlaceholder = () => {
    if (mode === 'anonymous') {
      return isConnected ? '메시지 입력...' : '행사장 진입 후 이용 가능'
    }
    if (!selectedGroup) return '모임을 선택해 주세요'
    if (isGroupRoomClosed) return '종료된 채팅방의 기록을 확인 중입니다'
    if (isGroupChatLoading) return '채팅방 연결 중...'
    if (!isGroupChatConnected) return '채팅방 연결 후 메시지를 보낼 수 있습니다'
    return '모임 메시지 입력...'
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {mode === 'group' && isGroupChatOpen && selectedGroup ? (
        <>
          <View style={[styles.header, styles.roomHeader, { paddingTop: 10 + insets.top }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setIsGroupChatOpen(false)
                setShowGroupInfo(false)
              }}
            >
              <Text style={styles.backButtonText}>‹ 채팅 목록</Text>
            </TouchableOpacity>
            <View style={styles.roomTitleRow}>
              <View style={styles.roomTitleBlock}>
                <Text style={styles.headerTitle} numberOfLines={1}>{selectedGroup.event || selectedGroup.title}</Text>
                <Text style={styles.headerSub} numberOfLines={1}>
                  {selectedGroup.currentMembers}명 참여 · {selectedGroup.meetingDate || '일정 미정'}
                </Text>
              </View>
              <TouchableOpacity style={styles.infoButton} onPress={() => setShowGroupInfo((value) => !value)}>
                <Text style={styles.infoButtonText}>{showGroupInfo ? '닫기' : '정보'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isGroupChatLoading && (
            <View style={styles.connectionBanner}>
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text style={styles.connectionText}>채팅방에 연결하고 있어요</Text>
            </View>
          )}
          {!!groupChatError && (
            <View style={styles.connectionBanner}>
              <Text style={styles.verifyText}>{groupChatError}</Text>
              {!isGroupRoomClosed && (
                <TouchableOpacity style={styles.retryBtn} onPress={() => { void handleRetryRoomPrep() }}>
                  <Text style={styles.retryBtnText}>재연결</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showGroupInfo && (
            <View style={styles.groupInfoBox}>
              <Text style={styles.groupInfoTitle}>모임 정보</Text>
              <Text style={styles.groupInfoText}>장소: {selectedGroup.location || '미정'}</Text>
              <Text style={styles.groupInfoText}>만남: {selectedGroup.meetingDate || '미정'} {selectedGroup.meetingTime || ''}</Text>
              <Text style={styles.groupInfoText}>인원: {selectedGroup.currentMembers}/{selectedGroup.maxMembers}명</Text>
              {isGroupRoomClosed && <Text style={styles.verifyText}>종료된 모임입니다. 이전 대화만 확인할 수 있습니다.</Text>}
              {!!verifyMessage && <Text style={styles.verifyText}>{verifyMessage}</Text>}
              <View style={styles.groupActionRow}>
                <TouchableOpacity
                  style={[styles.smallBtn, isGroupRoomClosed && styles.smallBtnDisabled]}
                  onPress={handleShareLocation}
                  disabled={isGroupRoomClosed}
                >
                  <Text style={styles.smallBtnText}>📍 위치 공유</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, (groupGathered || isGroupRoomClosed) && styles.smallBtnDisabled]}
                  onPress={handleVerifyGathering}
                  disabled={groupGathered || isGroupRoomClosed}
                >
                  <Text style={styles.smallBtnText}>{groupGathered ? '✅ 인증됨' : '모임 성사 인증'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.shareInfo}>현재 위치 공유 중 {sharedCount}명</Text>
            </View>
          )}

          <FlatList
            ref={groupMessageListRef}
            data={groupMessages.map((message) => ({
              id: message.id,
              user: message.user,
              nickname: message.user,
              userId: message.senderEmail ?? '',
              isMe: message.isMe,
              text: message.text,
              sentAt: message.sentAt,
            }))}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.roomMessagesContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => renderMessage(item)}
          />

          <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={getInputPlaceholder()}
              placeholderTextColor="#aaa"
              editable={Boolean(selectedGroup && !isGroupRoomClosed)}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, !canSendGroupMessage && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!canSendGroupMessage}
            >
              <Text style={styles.sendBtnText}>전송</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : mode === 'group' ? (
        <>
          <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
            <Text style={styles.headerTitle}>💬 채팅</Text>
            <Text style={styles.headerSub}>참여 중인 모임의 대화를 확인해 보세요.</Text>
          </View>
          <View style={styles.modeRow}>
            <TouchableOpacity style={[styles.modeBtn, styles.modeBtnInactive]} onPress={() => setMode('anonymous')}>
              <Text style={styles.modeText}>익명</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, styles.modeBtnActive]}>
              <Text style={[styles.modeText, styles.modeTextActive]}>모임 채팅방</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.listHeading}>
            <Text style={styles.listHeadingTitle}>모임 채팅</Text>
            <Text style={styles.listHeadingCount}>{joinedGroups.length}개</Text>
          </View>
          {loadingGroups ? (
            <ActivityIndicator color="#FF6B35" style={styles.listLoading} />
          ) : joinedGroups.length === 0 ? (
            <View style={styles.emptyRooms}>
              <Text style={styles.emptyRoomsIcon}>💬</Text>
              <Text style={styles.emptyRoomsTitle}>참여 중인 모임 채팅방이 없어요</Text>
              <Text style={styles.emptyRoomsText}>모임 탭에서 모임에 참여하면 이곳에서 대화를 시작할 수 있어요.</Text>
            </View>
          ) : (
            <FlatList
              data={joinedGroups}
              keyExtractor={(group) => String(group.id)}
              contentContainerStyle={styles.roomListContent}
              renderItem={({ item: group }) => (
                <TouchableOpacity
                  style={styles.roomListItem}
                  activeOpacity={0.75}
                  onPress={() => {
                    setSelectedGroupId(String(group.id))
                    setShowGroupInfo(false)
                    setIsGroupChatOpen(true)
                  }}
                >
                  <View style={styles.roomAvatar}><Text style={styles.roomAvatarText}>모</Text></View>
                  <View style={styles.roomListText}>
                    <View style={styles.roomListTitleRow}>
                      <Text style={styles.roomListTitle} numberOfLines={1}>{group.event || group.title}</Text>
                      <Text style={styles.roomListDate}>{group.meetingDate || '일정 미정'}</Text>
                    </View>
                    <Text style={styles.roomListPreview} numberOfLines={1}>
                      {group.location || '모임 채팅방'} · {group.currentMembers}/{group.maxMembers}명 참여
                    </Text>
                  </View>
                  <Text style={styles.roomChevron}>›</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </>
      ) : (
        <>
          <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
            <Text style={styles.headerTitle}>💬 현장 채팅</Text>
            <Text style={styles.headerSub}>
              {isConnected ? '📍 행사장 내 익명 채팅' : '행사장에 입장하면 채팅 가능'}
            </Text>
          </View>
          <View style={styles.modeRow}>
            <TouchableOpacity style={[styles.modeBtn, styles.modeBtnActive]}>
              <Text style={[styles.modeText, styles.modeTextActive]}>익명</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, styles.modeBtnInactive]} onPress={() => setMode('group')}>
              <Text style={styles.modeText}>모임 채팅방</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={visibleMessages}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            renderItem={({ item }) => renderMessage(item)}
          />
          <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={getInputPlaceholder()}
              placeholderTextColor="#aaa"
              editable={isConnected}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, !canSendAnonymousMessage && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!canSendAnonymousMessage}
            >
              <Text style={styles.sendBtnText}>전송</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  )
}

function renderMessage(item: ChatScreenMessage) {
  const isMine = item.isMe
  const sentAt = formatMessageTime(item.sentAt)
  const bubble = (
    <View style={[styles.bubble, isMine && styles.bubbleMine]}>
      {!isMine && <Text style={styles.nickname}>{item.nickname || item.user}</Text>}
      <Text style={[styles.messageText, isMine && styles.messageTextMine]}>{item.text}</Text>
    </View>
  )

  return (
    <View style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
      {isMine ? (
        <>
          {!!sentAt && <Text style={styles.messageTime}>{sentAt}</Text>}
          {bubble}
        </>
      ) : (
        <>
          {bubble}
          {!!sentAt && <Text style={styles.messageTime}>{sentAt}</Text>}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: '#FAFAF7' },
  header:               { paddingHorizontal: 16, paddingBottom: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
  headerTitle:          { fontSize: 20, fontWeight: '800', color: '#111827' },
  headerSub:            { marginTop: 4, fontSize: 12, color: '#6b7280' },
  modeRow:              { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  modeBtn:              { flex: 1, paddingVertical: 11, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' },
  modeBtnActive:        { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  modeBtnInactive:      { backgroundColor: '#fff', borderColor: '#e5e7eb' },
  modeText:             { fontSize: 14, fontWeight: '700', color: '#374151' },
  modeTextActive:       { color: '#fff' },
  listHeading:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 10 },
  listHeadingTitle:     { fontSize: 17, fontWeight: '800', color: '#111827' },
  listHeadingCount:     { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  listLoading:          { marginTop: 40 },
  emptyRooms:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingBottom: 48 },
  emptyRoomsIcon:       { fontSize: 42, marginBottom: 14 },
  emptyRoomsTitle:      { fontSize: 16, color: '#1f2937', fontWeight: '800', textAlign: 'center' },
  emptyRoomsText:       { marginTop: 8, fontSize: 13, color: '#89919e', lineHeight: 19, textAlign: 'center' },
  roomListContent:      { paddingHorizontal: 12, paddingBottom: 18 },
  roomListItem:         { minHeight: 82, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 12, backgroundColor: '#fff', borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#f0f0f0' },
  roomAvatar:           { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff0e8', marginRight: 12 },
  roomAvatarText:       { color: '#FF6B35', fontSize: 20, fontWeight: '900' },
  roomListText:         { flex: 1, minWidth: 0 },
  roomListTitleRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  roomListTitle:        { flex: 1, color: '#172033', fontSize: 14, fontWeight: '800' },
  roomListDate:         { color: '#9aa1ac', fontSize: 10 },
  roomListPreview:      { marginTop: 7, color: '#78808e', fontSize: 12 },
  roomChevron:          { color: '#b7bdc7', fontSize: 24, paddingLeft: 8 },
  roomHeader:           { paddingBottom: 12 },
  backButton:           { alignSelf: 'flex-start', paddingVertical: 6, paddingRight: 12, marginBottom: 6 },
  backButtonText:       { color: '#FF6B35', fontSize: 14, fontWeight: '700' },
  roomTitleRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  roomTitleBlock:       { flex: 1, minWidth: 0 },
  infoButton:           { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fff2eb' },
  infoButtonText:       { color: '#ed5d2c', fontSize: 12, fontWeight: '800' },
  connectionBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff7f2' },
  connectionText:       { color: '#737b88', fontSize: 12 },
  roomMessagesContent:  { flexGrow: 1, justifyContent: 'flex-end', paddingTop: 14, paddingBottom: 8 },
  groupPanel:           { marginHorizontal: 16, marginTop: 12, padding: 14, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#f0f0f0' },
  panelTitle:           { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 10 },
  panelText:            { fontSize: 12, color: '#6b7280', lineHeight: 18 },
  groupChipRow:         { gap: 10, paddingBottom: 6 },
  groupChip:            { width: 180, borderRadius: 16, padding: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb' },
  groupChipActive:      { borderColor: '#FF6B35', backgroundColor: '#fff7f2' },
  groupChipClosed:      { opacity: 0.6 },
  groupChipTitle:       { fontSize: 14, fontWeight: '800', color: '#111827' },
  groupChipTitleActive: { color: '#FF6B35' },
  groupChipSub:         { marginTop: 4, fontSize: 12, color: '#4b5563' },
  groupChipSubActive:   { color: '#7c2d12' },
  groupChipMeta:        { marginTop: 8, fontSize: 11, color: '#6b7280', fontWeight: '600' },
  groupChipMetaActive:  { color: '#92400e' },
  groupInfoBox:         { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: '#FFF8F2', borderWidth: 1, borderColor: '#ffd7c2' },
  groupInfoTitle:       { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  groupInfoText:        { fontSize: 12, color: '#374151', marginBottom: 3 },
  roomStatusRow:        { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  okText:               { marginTop: 6, fontSize: 12, color: '#059669', fontWeight: '700' },
  retryBtn:             { marginTop: 8, backgroundColor: '#374151', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' },
  retryBtnText:         { color: '#fff', fontSize: 12, fontWeight: '700' },
  groupActionRow:       { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallBtn:             { flex: 1, backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  smallBtnDisabled:     { backgroundColor: '#d1d5db' },
  smallBtnText:         { fontSize: 12, color: '#fff', fontWeight: '800' },
  shareInfo:            { marginTop: 8, fontSize: 12, color: '#6b7280' },
  verifyText:           { marginTop: 8, fontSize: 12, color: '#b45309', fontWeight: '700' },
  messageList:          { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  bubbleWrap:           { flexDirection: 'row', marginBottom: 10 },
  bubbleWrapMine:       { justifyContent: 'flex-end' },
  bubble:               { maxWidth: '78%', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#ececec' },
  bubbleMine:           { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  nickname:             { fontSize: 11, fontWeight: '800', color: '#6b7280', marginBottom: 4 },
  messageText:          { fontSize: 14, color: '#111827', lineHeight: 20 },
  messageTextMine:      { color: '#fff' },
  messageTime:          { color: '#94a3b8', fontSize: 10, marginBottom: 2 },
  inputRow:             { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f1f1' },
  input:                { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827', backgroundColor: '#fafafa' },
  sendBtn:              { backgroundColor: '#FF6B35', borderRadius: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:      { backgroundColor: '#d1d5db' },
  sendBtnText:          { color: '#fff', fontWeight: '800', fontSize: 13 },
})
