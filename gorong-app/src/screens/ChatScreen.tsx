import React, { useEffect, useMemo, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert
} from 'react-native'
import { useChat } from '../hooks/useChat'
import { useAuthStore } from '../store/authStore'
import { auth } from '../config/firebaseConfig'
import * as Location from 'expo-location'
import {
  createGroupRoom,
  joinGroupRoom,
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
  const [groupIdInput, setGroupIdInput] = useState('')
  const [groupId, setGroupId] = useState<string | null>(null)
  const [groupMessages, setGroupMessages] = useState<any[]>([])
  const [groupMembers, setGroupMembers] = useState<string[]>([])
  const [groupGathered, setGroupGathered] = useState(false)
  const [sharedCount, setSharedCount] = useState(0)
  const [sharedLocs, setSharedLocs] = useState<Record<string, { lat: number; lng: number }>>({})
  const [verifyMessage, setVerifyMessage] = useState('')
  const { insideVenueId } = useAuthStore()
  const myUid = auth.currentUser?.uid ?? null
  const { messages, sendMessage, isConnected } = useChat(insideVenueId)  // ← venueId 전달

  useEffect(() => {
    if (!groupId) return
    const unsubMsg = subscribeGroupChat(groupId, setGroupMessages)
    const unsubLoc = subscribeGroupLocations(groupId, (locs) => {
      setSharedLocs(locs)
      setSharedCount(Object.keys(locs).length)
    })
    const unsubRoom = subscribeGroupRoom(groupId, (room) => {
      setGroupMembers(room?.members ?? [])
      setGroupGathered(Boolean(room?.isGathered))
    })
    return () => {
      unsubMsg()
      unsubLoc()
      unsubRoom()
    }
  }, [groupId])

  const visibleMessages = useMemo(
    () => (mode === 'anonymous' ? messages : groupMessages),
    [mode, messages, groupMessages]
  )

  const handleCreateGroup = async () => {
    if (!insideVenueId || !myUid) {
      Alert.alert('안내', '행사장 진입 후 모임 생성이 가능합니다.')
      return
    }
    try {
      const newGroupId = await createGroupRoom(insideVenueId, myUid, 4)
      setGroupId(newGroupId)
      setGroupIdInput(newGroupId)
      setMode('group')
      Alert.alert('모임 생성', `모임 코드: ${newGroupId}`)
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '모임 생성 실패')
    }
  }

  const handleJoinGroup = async () => {
    if (!myUid || !groupIdInput.trim()) return
    try {
      await joinGroupRoom(groupIdInput.trim(), myUid)
      setGroupId(groupIdInput.trim())
      setMode('group')
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '모임 참가 실패')
    }
  }

  const handleShareLocation = async () => {
    if (!groupId || !myUid) return
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return
    const loc = await Location.getCurrentPositionAsync({})
    await shareLocation(groupId, myUid, loc.coords.latitude, loc.coords.longitude)
  }

  const getDistanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371000
    const dLat = (b.lat - a.lat) * Math.PI / 180
    const dLon = (b.lng - a.lng) * Math.PI / 180
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  }

  const handleVerifyGathering = async () => {
    if (!groupId) return
    if (groupMembers.length < 2) {
      setVerifyMessage('최소 2명 이상일 때만 모임 성사 검증이 가능합니다.')
      return
    }

    const missing = groupMembers.filter((id) => !sharedLocs[id])
    if (missing.length > 0) {
      setVerifyMessage(`위치 전송이 없는 인원 ${missing.length}명. 모두 위치 공유(5초) 후 다시 검증하세요.`)
      return
    }

    const points = groupMembers.map((id) => sharedLocs[id])
    let maxDistance = 0
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        maxDistance = Math.max(maxDistance, getDistanceMeters(points[i], points[j]))
      }
    }

    // 우버 픽업 유사 정책: 멤버 전원이 70m 내에 있으면 모임 성사
    if (maxDistance <= 70) {
      await markGroupGathered(groupId)
      setVerifyMessage(`검증 성공: 멤버 전원이 반경 70m 이내입니다. (최대 ${Math.round(maxDistance)}m)`)
    } else {
      setVerifyMessage(`검증 실패: 멤버 간 최대 거리 ${Math.round(maxDistance)}m (기준 70m)`)
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !myUid) return
    if (mode === 'anonymous') {
      await sendMessage(text)
    } else if (groupId) {
      await sendGroupMessage(groupId, {
        text,
        userId: myUid,
        nickname: '모임원',
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
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 현장 채팅</Text>
        <Text style={styles.headerSub}>
          {mode === 'anonymous'
            ? (isConnected ? '📍 행사장 내 익명 채팅' : '행사장에 입장하면 채팅 가능')
            : `👥 모임 채팅 (${groupMembers.length}/4) ${groupGathered ? '· 모임 인증 완료' : ''}`}
        </Text>
      </View>

      <View style={styles.modeRow}>
        <TouchableOpacity style={[styles.modeBtn, mode === 'anonymous' && styles.modeBtnActive]} onPress={() => setMode('anonymous')}>
          <Text style={styles.modeText}>익명</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeBtn, mode === 'group' && styles.modeBtnActive]} onPress={() => setMode('group')}>
          <Text style={styles.modeText}>모임</Text>
        </TouchableOpacity>
      </View>

      {mode === 'group' && (
        <View style={styles.groupPanel}>
          <View style={styles.groupRow}>
            <TouchableOpacity style={styles.smallBtn} onPress={handleCreateGroup}>
              <Text style={styles.smallBtnText}>모임 생성</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.groupInput}
              value={groupIdInput}
              onChangeText={setGroupIdInput}
              placeholder="모임 코드 입력"
            />
            <TouchableOpacity style={styles.smallBtn} onPress={handleJoinGroup}>
              <Text style={styles.smallBtnText}>참가</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.groupRow}>
            <TouchableOpacity style={styles.smallBtn} onPress={handleShareLocation} disabled={!groupId}>
              <Text style={styles.smallBtnText}>위치 공유(5초)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallBtn} onPress={handleVerifyGathering} disabled={!groupId || groupGathered}>
              <Text style={styles.smallBtnText}>{groupGathered ? '모임 인증됨' : '상호 검증'}</Text>
            </TouchableOpacity>
            <Text style={styles.shareInfo}>공유중 {sharedCount}명</Text>
          </View>
          {!!verifyMessage && <Text style={styles.verifyText}>{verifyMessage}</Text>}
        </View>
      )}

      {/* 메시지 목록 */}
      <FlatList
        data={visibleMessages}
        keyExtractor={item => item.id}
        style={styles.messageList}
        renderItem={({ item }) => (
          <View style={styles.messageBubble}>
            <Text style={styles.nickname}>{item.nickname}</Text>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />

      {/* 입력창 */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={mode === 'anonymous'
            ? (isConnected ? '메시지 입력...' : '행사장 진입 후 이용 가능')
            : (groupId ? '모임 메시지 입력...' : '모임 생성/참가 후 이용 가능')}
          editable={mode === 'anonymous' ? isConnected : Boolean(groupId)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !((mode === 'anonymous' && isConnected) || (mode === 'group' && groupId)) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!((mode === 'anonymous' && isConnected) || (mode === 'group' && groupId))}
        >
          <Text style={styles.sendBtnText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: {
    backgroundColor: '#FF6B35', paddingTop: 60, paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#fff', fontSize: 12, marginTop: 4, opacity: 0.85 },
  modeRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff' },
  modeBtn: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', paddingVertical: 8, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#FF6B35', borderColor: '#FF6B35' },
  modeText: { color: '#333', fontWeight: '700' },
  groupPanel: { paddingHorizontal: 12, paddingBottom: 8, backgroundColor: '#fff' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  smallBtn: { borderRadius: 8, backgroundColor: '#333', paddingHorizontal: 10, paddingVertical: 8 },
  smallBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  groupInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12 },
  shareInfo: { color: '#666', fontSize: 12, fontWeight: '600' },
  verifyText: { color: '#374151', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  messageList: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  messageBubble: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 10, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  nickname: { fontSize: 11, color: '#FF6B35', fontWeight: '600', marginBottom: 3 },
  messageText: { fontSize: 14, color: '#333' },
  inputRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 14,
  },
  sendBtn: {
    backgroundColor: '#FF6B35', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  sendBtnText: { color: '#fff', fontWeight: '600' },
})
