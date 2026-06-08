// ──────────────────────────────────────────────────────────────
// ChatScreen.tsx — 현장 채팅 화면
//
// 채팅 화면
// ──────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react'
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
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import * as Location from 'expo-location'
import { useChat } from '../hooks/useChat'
import { useAuthStore } from '../store/authStore'
import { auth } from '../config/firebaseConfig'
import { AppGroup } from '../types'
import { fetchAppGroups } from '../services/api'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ensureGroupRoom,
  markGroupGathered,
  sendGroupMessage,
  shareLocation,
  subscribeGroupChat,
  subscribeGroupLocations,
  subscribeGroupRoom,
} from '../services/firestore'

export default function ChatScreen() {
  const [mode, setMode] = useState<'anonymous' | 'group'>('anonymous')
  const [input, setInput] = useState('')
  const [groupMessages, setGroupMessages] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<string[]>([])
  const [groupGathered, setGroupGathered] = useState(false)
  const [sharedCount, setSharedCount] = useState(0)
  const [sharedLocs, setSharedLocs] = useState<Record<string, { lat: number; lng: number }>>({})
  const [verifyMessage, setVerifyMessage] = useState('')
  const [joinedGroups, setJoinedGroups] = useState<AppGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [groupRoomReady, setGroupRoomReady] = useState(false)
  const [groupRoomClosedAt, setGroupRoomClosedAt] = useState<number | null>(null)
  const [loadingGroups, setLoadingGroups] = useState(true)

  // [수정] 방 준비 실패 상태 별도 추적 → 재시도 버튼 노출용
  const [roomPrepFailed, setRoomPrepFailed] = useState(false)
  // [수정] 방 준비 중 로딩 표시용
  const [roomPreparing, setRoomPreparing] = useState(false)

  const insets = useSafeAreaInsets()
  const { insideVenueId, user } = useAuthStore()
  const myNickname = user?.nickname ?? '익명'
  const myUid = auth.currentUser?.uid ?? null

  const { messages, sendMessage, isConnected } = useChat(insideVenueId)

  const selectedGroup = useMemo(
    () => joinedGroups.find((group) => String(group.id) === selectedGroupId) ?? null,
    [joinedGroups, selectedGroupId]
  )

  const canUseGroupChat = Boolean(selectedGroup)
  const isGroupRoomClosed = Boolean(groupRoomClosedAt && Date.now() > groupRoomClosedAt)

  const canSendAnonymousMessage = mode === 'anonymous' && isConnected
  const canSendGroupMessage = Boolean(selectedGroup && canUseGroupChat && !isGroupRoomClosed)

  const parseChatDate = (value?: string | null) => {
    if (!value) return null
    const parts = value.split('-').map(Number)
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      return new Date(parts[0], parts[1] - 1, parts[2])
    }
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const isGroupListingClosed = (group: AppGroup) => {
    const meetingDate = parseChatDate(group.meetingDate)
    if (!meetingDate) return false
    const closedAt = new Date(meetingDate)
    closedAt.setDate(closedAt.getDate() + 3)
    closedAt.setHours(23, 59, 59, 999)
    return Date.now() > closedAt.getTime()
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
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
          return groups[0] ? String(groups[0].id) : null
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
    if (!selectedGroup || !myUid) {
      setGroupRoomReady(false)
      setGroupRoomClosedAt(null)
      setGroupMessages([])
      setGroupMembers([])
      setGroupGathered(false)
      setSharedLocs({})
      setSharedCount(0)
      setVerifyMessage('')
      setRoomPrepFailed(false)
      return
    }

    setSharedLocs({})
    setSharedCount(0)
    setVerifyMessage('')
    setRoomPrepFailed(false)
    setRoomPreparing(true)

    let unsubMsg: (() => void) | null = null
    let unsubLoc: (() => void) | null = null
    let unsubRoom: (() => void) | null = null
    let cancelled = false

    const groupId = String(selectedGroup.id)
    unsubMsg = subscribeGroupChat(groupId, setGroupMessages)
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
    setRoomPreparing(false)

    ;(async () => {
      try {
        await ensureGroupRoom(selectedGroup, myUid)
      } catch (error) {
        if (cancelled) return
        console.error('[ChatScreen] 모임 룸 생성 실패:', error)
        setRoomPrepFailed(true)
        setVerifyMessage('모임 채팅방 생성에 실패했습니다. 채팅은 계속 사용할 수 있습니다.')
      }
    })()

    return () => {
      cancelled = true
      unsubMsg?.()
      unsubLoc?.()
      unsubRoom?.()
    }
  }, [selectedGroup, myUid])

  // ── [수정] 재시도 함수 ────────────────────────────────────
  const handleRetryRoomPrep = async () => {
    if (!selectedGroup || !myUid) return
    setRoomPrepFailed(false)
    setRoomPreparing(true)
    setVerifyMessage('')
    try {
      await ensureGroupRoom(selectedGroup, myUid)
      setGroupRoomReady(true)
    } catch (err) {
      setRoomPrepFailed(true)
      setVerifyMessage('재시도 실패. 네트워크를 확인해 주세요.')
    } finally {
      setRoomPreparing(false)
    }
  }

  const visibleMessages = useMemo(
    () => (mode === 'anonymous' ? messages : groupMessages),
    [mode, messages, groupMessages]
  )

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
        await sendGroupMessage(String(selectedGroup.id), {
          text,
          userId: myUid,
          nickname: myNickname,
          createdAt: Date.now(),
          isAnonymous: false,
        })
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
    if (roomPreparing) return '채팅방 연결 중...'
    if (roomPrepFailed) return '채팅방 연결 실패 (재시도 버튼 누르세요)'
    if (isGroupRoomClosed) return '종료된 채팅방입니다'
    return '모임 메시지 입력...'
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: 16 + insets.top }]}>
        <Text style={styles.headerTitle}>💬 현장 채팅</Text>
        <Text style={styles.headerSub}>
          {mode === 'anonymous'
            ? (isConnected ? '📍 행사장 내 익명 채팅' : '행사장에 입장하면 채팅 가능')
            : (selectedGroup
              ? `👥 ${selectedGroup.event || selectedGroup.title} · ${selectedGroup.meetingDate || '미정'}`
              : '참여 중인 모임을 선택하세요')}
        </Text>
      </View>

      {/* 탭 전환 */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'anonymous' && styles.modeBtnActive]}
          onPress={() => setMode('anonymous')}
        >
          <Text style={[styles.modeText, mode === 'anonymous' && styles.modeTextActive]}>익명</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'group' && styles.modeBtnActive]}
          onPress={() => setMode('group')}
        >
          <Text style={[styles.modeText, mode === 'group' && styles.modeTextActive]}>모임</Text>
        </TouchableOpacity>
      </View>

      {/* 모임 패널 */}
      {mode === 'group' && (
        <View style={styles.groupPanel}>
          <Text style={styles.panelTitle}>참여 중인 모임</Text>

          {loadingGroups ? (
            <ActivityIndicator color="#FF6B35" style={{ marginVertical: 8 }} />
          ) : joinedGroups.length === 0 ? (
            <Text style={styles.panelText}>
              참여 중인 모임이 없습니다. 모임 탭에서 먼저 참가해 주세요.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupChipRow}>
              {joinedGroups.map((group) => {
                const active = String(group.id) === selectedGroupId
                const closed = isGroupListingClosed(group)
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.groupChip, active && styles.groupChipActive, closed && styles.groupChipClosed]}
                    onPress={() => setSelectedGroupId(String(group.id))}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.groupChipTitle, active && styles.groupChipTitleActive]} numberOfLines={1}>
                      {group.event || group.title}
                    </Text>
                    <Text style={[styles.groupChipSub, active && styles.groupChipSubActive]} numberOfLines={1}>
                      {group.meetingDate || '미정'} {group.meetingTime || ''}
                    </Text>
                    <Text style={[styles.groupChipMeta, active && styles.groupChipMetaActive]}>
                      {closed ? '종료' : `${group.currentMembers}/${group.maxMembers}명`}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          )}

          {selectedGroup && (
            <View style={styles.groupInfoBox}>
              <Text style={styles.groupInfoTitle}>{selectedGroup.event || selectedGroup.title}</Text>
              <Text style={styles.groupInfoText}>장소: {selectedGroup.location || '미정'}</Text>
              <Text style={styles.groupInfoText}>
                만남: {selectedGroup.meetingDate || '미정'} {selectedGroup.meetingTime || ''}
              </Text>
              <Text style={styles.groupInfoText}>
                인원: {selectedGroup.currentMembers}/{selectedGroup.maxMembers}
              </Text>

              {/* ── [수정] 방 상태 표시 ─────────────────────────── */}
              {roomPreparing && (
                <View style={styles.roomStatusRow}>
                  <ActivityIndicator size="small" color="#FF6B35" />
                  <Text style={styles.okText}> 채팅방 연결 중...</Text>
                </View>
              )}
              {!roomPreparing && groupRoomReady && !isGroupRoomClosed && (
                <Text style={styles.okText}>✅ 모임 채팅 연결됨</Text>
              )}
              {!roomPreparing && roomPrepFailed && (
                <TouchableOpacity style={styles.retryBtn} onPress={handleRetryRoomPrep}>
                  <Text style={styles.retryBtnText}>🔄 채팅방 재연결</Text>
                </TouchableOpacity>
              )}
              {isGroupRoomClosed && (
                <Text style={styles.verifyText}>채팅방이 종료되었습니다 (모임 날짜 3일 경과)</Text>
              )}

              {!!verifyMessage && <Text style={styles.verifyText}>{verifyMessage}</Text>}

              {/* ── 위치 공유 / 모임 성사 인증 버튼 ─────────────── */}
              <View style={styles.groupActionRow}>
                <TouchableOpacity
                  style={[
                    styles.smallBtn,
                    isGroupRoomClosed && styles.smallBtnDisabled,
                  ]}
                  onPress={handleShareLocation}
                  disabled={isGroupRoomClosed}
                >
                  <Text style={styles.smallBtnText}>📍 위치 공유(5초)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.smallBtn,
                    (groupGathered || isGroupRoomClosed) && styles.smallBtnDisabled,
                  ]}
                  onPress={handleVerifyGathering}
                  disabled={groupGathered || isGroupRoomClosed}
                >
                  <Text style={styles.smallBtnText}>
                    {groupGathered ? '✅ 인증됨' : '모임 성사 인증'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.shareInfo}>현재 위치 공유 중 {sharedCount}명</Text>
            </View>
          )}
        </View>
      )}

      {/* 메시지 목록 */}
      <FlatList
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
        renderItem={({ item }) => {
          const isMine = item.userId === myUid
          return (
            <View style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
              <View style={[styles.bubble, isMine && styles.bubbleMine]}>
                {!isMine && <Text style={styles.nickname}>{item.nickname}</Text>}
                <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
                  {item.text}
                </Text>
              </View>
            </View>
          )
        }}
      />

      {/* 입력창 */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={getInputPlaceholder()}
          placeholderTextColor="#aaa"
          editable={
            mode === 'anonymous'
              ? isConnected
              : Boolean(selectedGroup && !isGroupRoomClosed)
          }
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            !(canSendAnonymousMessage || canSendGroupMessage) && styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={!(canSendAnonymousMessage || canSendGroupMessage)}
        >
          <Text style={styles.sendBtnText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  modeText:             { fontSize: 14, fontWeight: '700', color: '#374151' },
  modeTextActive:       { color: '#fff' },
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
  bubble:               { maxWidth: '82%', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#ececec' },
  bubbleMine:           { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  nickname:             { fontSize: 11, fontWeight: '800', color: '#6b7280', marginBottom: 4 },
  messageText:          { fontSize: 14, color: '#111827', lineHeight: 20 },
  messageTextMine:      { color: '#fff' },
  inputRow:             { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f1f1' },
  input:                { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827', backgroundColor: '#fafafa' },
  sendBtn:              { backgroundColor: '#FF6B35', borderRadius: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:      { backgroundColor: '#d1d5db' },
  sendBtnText:          { color: '#fff', fontWeight: '800', fontSize: 13 },
})
