// ─────────────────────────────────────────────────────────────────
// ChatScreen.tsx — 현장 채팅 화면
//
// 구성
//   - 익명 채팅: 지오펜스 안에서만 참여 가능
//   - 모임 채팅: 웹에서 만든 모임 목록 중 참여한 모임만 선택
//                2명 이상인 모임만 Firestore room을 생성/활성화
//   - 혼자참여 모임은 익명 채팅만 가능
// ─────────────────────────────────────────────────────────────────

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
  const [loadingGroups, setLoadingGroups] = useState(true)
  const insets = useSafeAreaInsets()

  const { insideVenueId, user } = useAuthStore()

  const myNickname = user?.nickname ?? '익명'
  const myUid = auth.currentUser?.uid ?? null

  const { messages, sendMessage, isConnected } = useChat(insideVenueId)

  const selectedGroup = useMemo(
    () => joinedGroups.find((group) => String(group.id) === selectedGroupId) ?? null,
    [joinedGroups, selectedGroupId]
  )

  const canUseGroupChat = Boolean(selectedGroup && selectedGroup.currentMembers >= 2)

  useEffect(() => {
    ;(async () => {
      setLoadingGroups(true)
      try {
        const response = await fetchAppGroups()
        const groups = response.data.filter((group) => group.joined)
        setJoinedGroups(groups)
        setSelectedGroupId((current) => {
          if (current && groups.some((group) => String(group.id) === current)) {
            return current
          }
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

  useEffect(() => {
    if (!selectedGroup || !myUid) {
      setGroupRoomReady(false)
      setGroupMessages([])
      setGroupMembers([])
      setGroupGathered(false)
      setSharedLocs({})
      setSharedCount(0)
      setVerifyMessage('')
      return
    }

    if (!canUseGroupChat) {
      setGroupRoomReady(false)
      setGroupMessages([])
      setGroupMembers([])
      setGroupGathered(false)
      setSharedLocs({})
      setSharedCount(0)
      setVerifyMessage('2명 이상 참여한 모임만 모임 채팅을 사용할 수 있습니다.')
      return
    }

    setSharedLocs({})
    setSharedCount(0)
    setVerifyMessage('')
    let unsubMsg: (() => void) | null = null
    let unsubLoc: (() => void) | null = null
    let unsubRoom: (() => void) | null = null
    let cancelled = false

    ;(async () => {
      try {
        await ensureGroupRoom(selectedGroup, myUid)
        if (cancelled) return

        const groupId = String(selectedGroup.id)
        setGroupRoomReady(true)

        unsubMsg = subscribeGroupChat(groupId, setGroupMessages)
        unsubLoc = subscribeGroupLocations(groupId, (locs) => {
          setSharedLocs(locs)
          setSharedCount(Object.keys(locs).length)
        })
        unsubRoom = subscribeGroupRoom(groupId, (room) => {
          setGroupMembers(room?.members ?? [])
          setGroupGathered(Boolean(room?.isGathered))
        })
      } catch (error) {
        console.error('[ChatScreen] 모임 룸 준비 실패:', error)
        setGroupRoomReady(false)
        setVerifyMessage('모임 채팅방을 준비하지 못했습니다.')
      }
    })()

    return () => {
      cancelled = true
      unsubMsg?.()
      unsubLoc?.()
      unsubRoom?.()
    }
  }, [selectedGroup, myUid, canUseGroupChat])

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
    if (!selectedGroup || !groupRoomReady || !myUid) return
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return
    const loc = await Location.getCurrentPositionAsync({})
    await shareLocation(String(selectedGroup.id), myUid, loc.coords.latitude, loc.coords.longitude)
  }

  const handleVerifyGathering = async () => {
    if (!selectedGroup || !groupRoomReady) return
    if (groupMembers.length < 2) {
      setVerifyMessage('2명 이상인 모임만 성사 인증이 가능합니다.')
      return
    }
    const missing = groupMembers.filter((id) => !sharedLocs[id])
    if (missing.length > 0) {
      setVerifyMessage(`위치 전송이 없는 인원 ${missing.length}명. 모두 위치 공유 후 다시 시도하세요.`)
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
      setVerifyMessage(`✅ 모임 성사! 전원 반경 70m 이내 (최대 ${Math.round(maxDist)}m)`)
    } else {
      setVerifyMessage(`❌ 인증 실패: 멤버 간 최대 거리 ${Math.round(maxDist)}m (기준 70m)`)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !myUid) return

    if (mode === 'anonymous') {
      await sendMessage(text)
    } else if (selectedGroup && canUseGroupChat && groupRoomReady) {
      await sendGroupMessage(String(selectedGroup.id), {
        text,
        userId: myUid,
        nickname: myNickname,
        createdAt: Date.now(),
        isAnonymous: false,
      })
    }
    setInput('')
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
              ? `👥 ${selectedGroup.event || selectedGroup.title} · ${selectedGroup.meetingDate || '미정'} ${selectedGroup.meetingTime || ''}`
              : '참여 중인 모임을 선택하세요')}
        </Text>
      </View>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'anonymous' && styles.modeBtnActive]}
          onPress={() => setMode('anonymous')}
        >
          <Text style={[styles.modeText, mode === 'anonymous' && styles.modeTextActive]}>
            익명
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'group' && styles.modeBtnActive]}
          onPress={() => setMode('group')}
        >
          <Text style={[styles.modeText, mode === 'group' && styles.modeTextActive]}>
            모임
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'group' && (
        <View style={styles.groupPanel}>
          <Text style={styles.panelTitle}>참여 중인 모임</Text>

          {loadingGroups ? (
            <Text style={styles.panelText}>모임 목록을 불러오는 중...</Text>
          ) : joinedGroups.length === 0 ? (
            <Text style={styles.panelText}>
              참여 중인 모임이 없습니다. 모임 탭에서 먼저 참가해 주세요.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupChipRow}>
              {joinedGroups.map((group) => {
                const active = String(group.id) === selectedGroupId
                const solo = group.maxMembers <= 1 || group.currentMembers < 2
                return (
                  <TouchableOpacity
                    key={group.id}
                    style={[styles.groupChip, active && styles.groupChipActive]}
                    onPress={() => setSelectedGroupId(String(group.id))}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.groupChipTitle, active && styles.groupChipTitleActive]} numberOfLines={1}>
                      {group.event || group.title}
                    </Text>
                    <Text style={[styles.groupChipSub, active && styles.groupChipSubActive]} numberOfLines={1}>
                      {group.meetingDate || '미정'} {group.meetingTime || ''}
                    </Text>
                    <Text style={[styles.groupChipMeta, active && styles.groupChipMetaActive]} numberOfLines={1}>
                      {solo ? '혼자참여 · 채팅 없음' : `${group.currentMembers}/${group.maxMembers}명`}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          )}

          {selectedGroup && (
            <View style={styles.groupInfoBox}>
              <Text style={styles.groupInfoTitle}>{selectedGroup.event || selectedGroup.title}</Text>
              <Text style={styles.groupInfoText}>모임명: {selectedGroup.title || '미정'}</Text>
              <Text style={styles.groupInfoText}>장소: {selectedGroup.location || '미정'}</Text>
              <Text style={styles.groupInfoText}>
                만나는 시간: {(selectedGroup.meetingDate || '미정')} {selectedGroup.meetingTime || ''}
              </Text>
              <Text style={styles.groupInfoText}>
                인원: {selectedGroup.currentMembers}/{selectedGroup.maxMembers}
              </Text>
              {selectedGroup.maxMembers <= 1 || selectedGroup.currentMembers < 2 ? (
                <Text style={styles.warnText}>혼자참여는 모임 채팅방을 생성하지 않습니다.</Text>
              ) : (
                <Text style={styles.okText}>모임 채팅 사용 가능</Text>
              )}
              {!!verifyMessage && <Text style={styles.verifyText}>{verifyMessage}</Text>}

              <View style={styles.groupActionRow}>
                <TouchableOpacity
                  style={[styles.smallBtn, (!selectedGroup || !groupRoomReady || !canUseGroupChat) && styles.smallBtnDisabled]}
                  onPress={handleShareLocation}
                  disabled={!selectedGroup || !groupRoomReady || !canUseGroupChat}
                >
                  <Text style={styles.smallBtnText}>📍 위치 공유(5초)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, (!selectedGroup || !groupRoomReady || !canUseGroupChat || groupGathered) && styles.smallBtnDisabled]}
                  onPress={handleVerifyGathering}
                  disabled={!selectedGroup || !groupRoomReady || !canUseGroupChat || groupGathered}
                >
                  <Text style={styles.smallBtnText}>
                    {groupGathered ? '✅ 인증됨' : '모임 성사 인증'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.shareInfo}>공유 {sharedCount}명</Text>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
        onContentSizeChange={() => {}}
        renderItem={({ item }) => {
          const isMine = item.userId === myUid
          return (
            <View style={[styles.bubbleWrap, isMine && styles.bubbleWrapMine]}>
              <View style={[styles.bubble, isMine && styles.bubbleMine]}>
                {!isMine && (
                  <Text style={styles.nickname}>{item.nickname}</Text>
                )}
                <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
                  {item.text}
                </Text>
              </View>
            </View>
          )
        }}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={
            mode === 'anonymous'
              ? (isConnected ? '메시지 입력...' : '행사장 진입 후 이용 가능')
              : (selectedGroup && canUseGroupChat && groupRoomReady
                ? '모임 메시지 입력...'
                : '2명 이상 모임만 이용 가능')
          }
          placeholderTextColor="#aaa"
          editable={
            mode === 'anonymous'
              ? isConnected
              : Boolean(selectedGroup && canUseGroupChat && groupRoomReady)
          }
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            !((mode === 'anonymous' && isConnected) || (mode === 'group' && selectedGroup && canUseGroupChat && groupRoomReady)) &&
              styles.sendBtnDisabled,
          ]}
          onPress={handleSend}
          disabled={
            !((mode === 'anonymous' && isConnected) || (mode === 'group' && selectedGroup && canUseGroupChat && groupRoomReady))
          }
        >
          <Text style={styles.sendBtnText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF7',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  headerSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  modeRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  modeTextActive: {
    color: '#fff',
  },
  groupPanel: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  panelTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  panelText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  groupChipRow: {
    gap: 10,
    paddingBottom: 6,
  },
  groupChip: {
    width: 180,
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  groupChipActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#fff7f2',
  },
  groupChipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  groupChipTitleActive: {
    color: '#FF6B35',
  },
  groupChipSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#4b5563',
  },
  groupChipSubActive: {
    color: '#7c2d12',
  },
  groupChipMeta: {
    marginTop: 8,
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  groupChipMetaActive: {
    color: '#92400e',
  },
  groupInfoBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFF8F2',
    borderWidth: 1,
    borderColor: '#ffd7c2',
  },
  groupInfoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  groupInfoText: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 3,
  },
  warnText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6d28d9',
    fontWeight: '700',
  },
  okText: {
    marginTop: 6,
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  groupActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  smallBtn: {
    flex: 1,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  smallBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  smallBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '800',
  },
  shareInfo: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  verifyText: {
    marginTop: 8,
    fontSize: 12,
    color: '#b45309',
    fontWeight: '700',
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  bubbleWrap: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  bubbleWrapMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ececec',
  },
  bubbleMine: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  nickname: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  messageTextMine: {
    color: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fafafa',
  },
  sendBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#d1d5db',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
})
