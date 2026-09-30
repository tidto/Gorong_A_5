import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useFocusEffect } from '@react-navigation/native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NavigationProp } from '@react-navigation/native'
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { auth } from '../config/firebaseConfig'
import {
  checkArrivalStatus,
  createAppGroup,
  deleteAppGroup,
  fetchAppGroups,
  fetchMyParticipations,
  joinAppGroup,
  uploadFileToS3,
  verifyArrival,
} from '../services/api'
import type { AppGroup, EventParticipation } from '../types'
import type { MainStackParamList } from '../navigation/AppNavigator'
import GroupPostFormFields from '../components/GroupPostFormFields'
import { prepareImageForUpload } from '../utils/imageUpload'

const PREVIEW_LIMIT = 5

function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isUpcomingParticipation(item: EventParticipation) {
  const visitDate = parseDate(item.visitDate)
  if (!visitDate) return true
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return visitDate.getTime() <= today.getTime()
}

function mapStatusLabel(status: string) {
  switch (status?.toUpperCase()) {
    case 'RECRUITING':
      return '모집중'
    case 'CLOSED':
      return '마감'
    case 'FINISHED':
      return '완료'
    default:
      return status || '상태 미정'
  }
}

function formatVisitDate(value?: string | null) {
  const date = parseDate(value)
  if (!date) return '날짜 미정'
  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', weekday: 'short' })
}

export default function GroupScreen() {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>()
  const [groups, setGroups] = useState<AppGroup[]>([])
  const [participations, setParticipations] = useState<EventParticipation[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [arrivalVerifiedByVenueId, setArrivalVerifiedByVenueId] = useState<Record<string, boolean>>({})
  const [verifyingVenueId, setVerifyingVenueId] = useState<string | null>(null)
  const [showAllGroups, setShowAllGroups] = useState(false)
  const [showAllParticipations, setShowAllParticipations] = useState(false)
  const [activeTab, setActiveTab] = useState<'participations' | 'groups'>('participations')
  const [createVisible, setCreateVisible] = useState(false)
  const [savingGroup, setSavingGroup] = useState(false)
  const [draft, setDraft] = useState({ title: '', event: '', eventContentId: '', location: '', content: '', maxMembers: '4', meetingDate: '', meetingTime: '', condition: '' })
  const insets = useSafeAreaInsets()

  const waitForAuthReady = useCallback(async () => {
    if (auth.currentUser) return true
    return await new Promise<boolean>((resolve) => {
      const unsub = auth.onAuthStateChanged((user) => {
        if (user) {
          unsub()
          resolve(true)
        }
      })
      setTimeout(() => {
        unsub()
        resolve(false)
      }, 3000)
    })
  }, [])

  const loadData = useCallback(async () => {
    try {
      const ready = await waitForAuthReady()
      if (!ready) {
        throw new Error('로그인 정보가 아직 준비되지 않았습니다.')
      }
      const [groupRes, participationRes] = await Promise.allSettled([
        fetchAppGroups(),
        fetchMyParticipations(),
      ])

      if (groupRes.status === 'fulfilled') {
        setGroups(groupRes.value.data)
      } else {
        console.error('그룹 목록 조회 실패:', groupRes.reason)
      }

      if (participationRes.status === 'fulfilled') {
        setParticipations(participationRes.value.data)
      } else {
        console.error('참여 이력 조회 실패:', participationRes.reason)
      }
    } catch (error) {
      console.error('그룹 목록 조회 실패:', error)
      Alert.alert('오류', '그룹 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [waitForAuthReady])

  // 모임 탭에 들어올 때마다 목록을 다시 불러온다 (웹에서 새로 올린 모집글 반영)
  useFocusEffect(
      useCallback(() => {
        loadData()
      }, [loadData])
  )

  const trackedVenueIds = useMemo(() => {
    const ids = [
      ...groups.map((group) => (group.eventContentId ?? group.event)?.trim()),
      ...participations.map((item) => item.eventContentId?.trim()),
    ].filter((value): value is string => Boolean(value))
    return Array.from(new Set(ids))
  }, [groups, participations])

  const resolveCurrentLocation = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('권한 필요', '지오펜싱 인증을 위해 위치 권한이 필요합니다.')
      return null
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })
    return location.coords
  }, [])

  const verifyVenueArrival = useCallback(async (venueId: string, label?: string) => {
    const normalizedVenueId = venueId.trim()
    if (!normalizedVenueId) return

    setVerifyingVenueId(normalizedVenueId)
    try {
      const coords = await resolveCurrentLocation()
      if (!coords) return

      const response = await verifyArrival(normalizedVenueId, coords.latitude, coords.longitude)
      const verified = response.status === 200
      if (!verified) {
        Alert.alert('안내', '행사장 반경 밖입니다.')
        return
      }

      setArrivalVerifiedByVenueId((current) => ({ ...current, [normalizedVenueId]: true }))
      Alert.alert('완료', `${label ?? '행사'} 지오펜싱 인증이 완료되었습니다.`)
    } catch (error) {
      console.error('지오펜싱 인증 실패:', error)
      Alert.alert('안내', '지오펜싱 인증에 실패했습니다. 위치 권한과 현재 위치를 확인해주세요.')
    } finally {
      setVerifyingVenueId(null)
    }
  }, [resolveCurrentLocation])

  const resolveGroupVenueId = useCallback((group: AppGroup) => {
    const explicitVenueId = group.eventContentId?.trim()
    if (explicitVenueId) return explicitVenueId
    const fallback = group.event?.trim()
    if (fallback && /^\d+$/.test(fallback)) return fallback
    return null
  }, [])

  useEffect(() => {
    if (!trackedVenueIds.length) return

    let cancelled = false
    ;(async () => {
      const statuses = await Promise.allSettled(
          trackedVenueIds.map(async (venueId) => {
            const res = await checkArrivalStatus(venueId)
            return [venueId, Boolean(res.data?.verified)] as const
          })
      )

      if (cancelled) return
      const next: Record<string, boolean> = {}
      for (const item of statuses) {
        if (item.status === 'fulfilled') {
          const [venueId, verified] = item.value
          next[venueId] = verified
        }
      }
      setArrivalVerifiedByVenueId(next)
    })()

    return () => {
      cancelled = true
    }
  }, [trackedVenueIds])

  const upcomingParticipations = useMemo(
      () => participations.filter(isUpcomingParticipation),
      [participations]
  )

  const recruitingGroups = useMemo(
      () => groups.filter((group) => group.status?.toUpperCase() === 'RECRUITING'),
      [groups]
  )

  const visibleParticipations = showAllParticipations
      ? upcomingParticipations
      : upcomingParticipations.slice(0, PREVIEW_LIMIT)

  const visibleGroups = showAllGroups
      ? recruitingGroups
      : recruitingGroups.slice(0, PREVIEW_LIMIT)

  const handleJoin = async (groupId: number) => {
    try {
      await joinAppGroup(groupId)
      Alert.alert('완료', '그룹에 참가했습니다.')
      loadData()
    } catch (error) {
      console.error('그룹 참가 실패:', error)
      Alert.alert('안내', '참가에 실패했습니다. 인원 초과 또는 권한을 확인해주세요.')
    }
  }

  const handleCreateGroup = async () => {
    if (!draft.title.trim() || !draft.event.trim() || !draft.location.trim() || !draft.meetingDate.trim() || !draft.meetingTime.trim()) {
      Alert.alert('입력 확인', '모임명, 행사, 장소, 날짜와 시간은 필수입니다.')
      return
    }
    const maxMembers = Number(draft.maxMembers)
    if (!Number.isInteger(maxMembers) || maxMembers < 2 || maxMembers > 100) {
      Alert.alert('입력 확인', '모집 인원은 2명 이상 100명 이하로 입력해주세요.')
      return
    }
    setSavingGroup(true)
    try {
      await createAppGroup({ ...draft, title: draft.title.trim(), event: draft.event.trim(), location: draft.location.trim(), content: draft.content.trim(), condition: draft.condition.trim(), maxMembers })
      setCreateVisible(false)
      setDraft({ title: '', event: '', eventContentId: '', location: '', content: '', maxMembers: '4', meetingDate: '', meetingTime: '', condition: '' })
      await loadData()
      Alert.alert('완료', '모집글을 등록했습니다.')
    } catch (error) {
      console.error('모집글 등록 실패:', error)
      Alert.alert('안내', '모집글 등록에 실패했습니다. 로그인 상태를 확인해주세요.')
    } finally {
      setSavingGroup(false)
    }
  }

  const confirmDeleteGroup = (group: AppGroup) => Alert.alert('모집글 삭제', '이 모집글을 삭제할까요?', [
    { text: '취소', style: 'cancel' },
    { text: '삭제', style: 'destructive', onPress: async () => {
      try {
        await deleteAppGroup(group.id)
        setGroups((current) => current.filter((item) => item.id !== group.id))
        Alert.alert('완료', '모집글을 삭제했습니다.')
      } catch (error) {
        console.error('모집글 삭제 실패:', error)
        Alert.alert('안내', '모집글 삭제에 실패했습니다.')
      }
    } },
  ])

  const handleUploadPhoto = async (group: AppGroup) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.')
        return
      }

      const venueId = resolveGroupVenueId(group)
      if (!venueId || !arrivalVerifiedByVenueId[venueId]) {
        Alert.alert('안내', '지오펜싱 참여 인증이 완료된 행사만 사진을 올릴 수 있습니다.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      })

      if (result.canceled || !result.assets.length) return

      const asset = result.assets[0]
      const prepared = await prepareImageForUpload(asset, `event-${venueId || group.id}-${Date.now()}.jpg`)
      const response = await uploadFileToS3(prepared.uri, prepared.fileName, 'APP_PHOTO', true, venueId)
      Alert.alert('완료', response.data?.gallerySaved ? '행사 사진이 갤러리에 저장되었습니다.' : '사진 업로드가 완료되었습니다.')
      loadData()
    } catch (error) {
      console.error('사진 업로드 실패:', error)
      Alert.alert('안내', '사진 업로드에 실패했습니다. 지오펜싱 인증 여부를 확인해주세요.')
    }
  }

  const handleGroupSecondaryAction = async (group: AppGroup) => {
    if (!group.joined) return

    const venueId = resolveGroupVenueId(group)
    if (!venueId) {
      Alert.alert('안내', '이 모임에는 지오펜싱 행사 ID가 연결되어 있지 않습니다.')
      return
    }

    const verified = arrivalVerifiedByVenueId[venueId]
    if (!verified) {
      await verifyVenueArrival(venueId, group.title || group.event)
      return
    }

    await handleUploadPhoto(group)
  }

  if (loading) {
    return (
        <View style={styles.center}>
          <Text>그룹 정보를 불러오는 중...</Text>
        </View>
    )
  }

  return (
      <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: 16 + insets.top, paddingBottom: 24 + insets.bottom }]}
          refreshControl={
            <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true)
                  loadData()
                }}
            />
          }
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>모임</Text>
          <Text style={styles.heroSub}>
            혼자참여와 그룹참여를 나눠서 보여주고, 모집중인 모임만 따로 확인합니다.
          </Text>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
              style={[styles.tabButton, activeTab === 'participations' && styles.tabButtonActive]}
              onPress={() => setActiveTab('participations')}
          >
            <Text style={[styles.tabText, activeTab === 'participations' && styles.tabTextActive]}>
              내 참여 행사 {upcomingParticipations.length}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={[styles.tabButton, activeTab === 'groups' && styles.tabButtonActive]}
              onPress={() => setActiveTab('groups')}
          >
            <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
              모집 중 모임 {recruitingGroups.length}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'participations' && (
            <>
              {visibleParticipations.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>당일 또는 예정된 참여 행사가 없습니다.</Text>
                    <Text style={styles.emptyText}>혼자참여한 행사도 여기에 표시됩니다.</Text>
                  </View>
              ) : (
                  visibleParticipations.map((item) => (
                      <View key={item.id} style={styles.card}>
                        <View style={styles.badgeRow}>
                          <Text style={styles.badge}>{item.participationType === 'SOLO' ? '혼자참여' : '그룹참여'}</Text>
                          <Text style={styles.statusBadge}>
                            {arrivalVerifiedByVenueId[item.eventContentId] ? '지오펜싱 완료' : formatVisitDate(item.visitDate)}
                          </Text>
                        </View>
                        <Text style={styles.eventTitle}>{item.eventTitle || '행사명 미정'}</Text>
                        <Text style={styles.meta}>행사 ID: {item.eventContentId}</Text>
                        <Text style={styles.meta}>참여 방식: {item.participationType === 'SOLO' ? '혼자' : '모임'}</Text>
                        <TouchableOpacity
                            style={[
                              styles.secondaryButton,
                              (!item.eventContentId || verifyingVenueId === item.eventContentId) && styles.buttonDisabled,
                            ]}
                            disabled={!item.eventContentId || verifyingVenueId === item.eventContentId}
                            onPress={() => verifyVenueArrival(item.eventContentId, item.eventTitle)}
                        >
                          <Text style={styles.secondaryButtonText}>
                            {verifyingVenueId === item.eventContentId
                                ? '인증 중...'
                                : arrivalVerifiedByVenueId[item.eventContentId]
                                    ? '지오펜싱 완료'
                                    : '지오펜싱 인증'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                  ))
              )}

              {upcomingParticipations.length > PREVIEW_LIMIT && (
                  <TouchableOpacity style={styles.moreBtn} onPress={() => setShowAllParticipations((prev) => !prev)}>
                    <Text style={styles.moreBtnText}>{showAllParticipations ? '접기' : '더보기'}</Text>
                  </TouchableOpacity>
              )}
            </>
        )}

        {activeTab === 'groups' && (
            <>
              <TouchableOpacity style={styles.createButton} onPress={() => setCreateVisible(true)}>
                <Text style={styles.createButtonText}>＋ 모집글 작성</Text>
              </TouchableOpacity>
              {visibleGroups.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>모집 중인 모임이 없습니다.</Text>
                    <Text style={styles.emptyText}>마감/완료 모임은 숨기고 모집중만 보여줍니다.</Text>
                  </View>
              ) : (
                  visibleGroups.map((group) => {
                    const isFull = group.currentMembers >= group.maxMembers
                    return (
                        <View key={group.id} style={styles.card}>
                          <View style={styles.badgeRow}>
                            <Text style={styles.badge}>모임</Text>
                            <Text style={styles.statusBadge}>{mapStatusLabel(group.status)}</Text>
                          </View>
                          <Text style={styles.eventTitle}>{group.event || '이벤트 미정'}</Text>
                          <Text style={styles.groupTitle}>{group.title || '모임 정보'}</Text>
                          <Text style={styles.meta}>만나는 장소: {group.location || '미정'}</Text>
                          <Text style={styles.meta}>만나는 시간: {(group.meetingDate || '미정')} {group.meetingTime || ''}</Text>
                          <Text style={styles.meta}>인원: {group.currentMembers}/{group.maxMembers}</Text>
                          {group.ownedByMe && (
                              <TouchableOpacity style={styles.deleteButton} onPress={() => confirmDeleteGroup(group)}>
                                <Text style={styles.deleteButtonText}>모집글 삭제</Text>
                              </TouchableOpacity>
                          )}
                          <View style={styles.row}>
                            <TouchableOpacity
                                style={[styles.button, (group.joined || isFull) && styles.buttonDisabled]}
                                disabled={group.joined || isFull}
                                onPress={() => handleJoin(group.id)}
                            >
                              <Text style={styles.buttonText}>{group.joined ? '참가 완료' : isFull ? '정원 마감' : '참가하기'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.detailButton]}
                                onPress={() => navigation.navigate('GroupDetail', { group })}
                            >
                              <Text style={styles.buttonText}>상세보기</Text>
                            </TouchableOpacity>
                          </View>
                          {group.joined && (
                              <TouchableOpacity
                                  style={[
                                    styles.secondaryButton,
                                    (!resolveGroupVenueId(group) || verifyingVenueId === resolveGroupVenueId(group)) && styles.buttonDisabled,
                                  ]}
                                  disabled={!resolveGroupVenueId(group) || verifyingVenueId === resolveGroupVenueId(group)}
                                  onPress={() => handleGroupSecondaryAction(group)}
                              >
                                <Text style={styles.secondaryButtonText}>
                                  {verifyingVenueId === resolveGroupVenueId(group)
                                      ? '인증 중...'
                                      : resolveGroupVenueId(group) && arrivalVerifiedByVenueId[resolveGroupVenueId(group)!]
                                          ? '행사 사진 올리기'
                                          : '지오펜싱 인증'}
                                </Text>
                              </TouchableOpacity>
                          )}
                        </View>
                    )
                  })
              )}

              {recruitingGroups.length > PREVIEW_LIMIT && (
                  <TouchableOpacity style={styles.moreBtn} onPress={() => setShowAllGroups((prev) => !prev)}>
                    <Text style={styles.moreBtnText}>{showAllGroups ? '접기' : '더보기'}</Text>
                  </TouchableOpacity>
              )}
            </>
        )}
        <Modal visible={createVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCreateVisible(false)}>
          <View style={[styles.modal, { paddingTop: Math.max(insets.top, 18) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>모집글 작성</Text>
              <TouchableOpacity onPress={() => setCreateVisible(false)}><Text style={styles.modalClose}>닫기</Text></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
              <GroupPostFormFields
                value={{ ...draft, maxMembers: Number(draft.maxMembers) || 0 }}
                onChange={(key, value) => setDraft((current) => ({ ...current, [key]: key === 'maxMembers' ? String(value) : String(value) }))}
                footer={(
                  <TouchableOpacity style={[styles.submitButton, savingGroup && styles.buttonDisabled]} disabled={savingGroup} onPress={handleCreateGroup}>
                    <Text style={styles.submitButtonText}>{savingGroup ? '등록 중...' : '모집글 등록'}</Text>
                  </TouchableOpacity>
                )}
              />
            </ScrollView>
          </View>
        </Modal>
      </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7FB' },
  content: { paddingHorizontal: 16, gap: 12 },
  hero: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  heroTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroSub: { color: '#fff', fontSize: 12, marginTop: 6, opacity: 0.9, lineHeight: 18 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#EBEDF2',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  tabTextActive: { color: '#FF6B35', fontWeight: '800' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  sectionMeta: { fontSize: 12, color: '#6b7280', fontWeight: '700' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1E8',
    color: '#FF6B35',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    color: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  eventTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4, color: '#111827' },
  groupTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8, color: '#FF6B35' },
  meta: { fontSize: 13, color: '#374151', marginBottom: 3 },
  row: { marginTop: 10, flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#C9CDD5' },
  buttonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  detailButton: { backgroundColor: '#334155' },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  createButton: { backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  createButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  deleteButton: { alignSelf: 'flex-end', marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: '#FFF1F0' },
  deleteButtonText: { color: '#C2413A', fontSize: 12, fontWeight: '800' },
  modal: { flex: 1, backgroundColor: '#F6F7FB', paddingHorizontal: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  modalTitle: { color: '#1e293b', fontSize: 19, fontWeight: '900' },
  modalClose: { color: '#64748b', fontWeight: '700', padding: 8 },
  form: { gap: 13, paddingBottom: 32 },
  field: { gap: 6 },
  fieldLabel: { color: '#334155', fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#DDE2EA', backgroundColor: '#fff', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, color: '#1e293b', fontSize: 14 },
  multilineInput: { minHeight: 100, paddingTop: 12 },
  submitButton: { backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 6 },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 6 },
  emptyText: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
  moreBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  moreBtnText: { fontSize: 13, fontWeight: '800', color: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
})
