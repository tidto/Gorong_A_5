import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import * as Location from 'expo-location'
import MapView, { Marker } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { StackScreenProps } from '@react-navigation/stack'
import type { MainStackParamList } from '../navigation/AppNavigator'
import { deleteAppGroup, updateAppGroup, type CreateAppGroupPayload } from '../services/api'
import type { AppGroup } from '../types'
import GroupPostFormFields from '../components/GroupPostFormFields'

type Props = StackScreenProps<MainStackParamList, 'GroupDetail'>
type FormState = CreateAppGroupPayload

const toForm = (group: AppGroup): FormState => ({
  title: group.title ?? '',
  event: group.event ?? '',
  eventContentId: group.eventContentId ?? '',
  location: group.location ?? '',
  content: group.content ?? '',
  maxMembers: group.maxMembers ?? 4,
  meetingDate: group.meetingDate ?? '',
  meetingTime: group.meetingTime ?? '',
  condition: group.condition ?? '',
})

export default function GroupDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets()
  const [group, setGroup] = useState(route.params.group)
  const [form, setForm] = useState<FormState>(() => toForm(route.params.group))
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [meetingCoordinate, setMeetingCoordinate] = useState<{ latitude: number; longitude: number } | null>(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [mapError, setMapError] = useState('')

  useEffect(() => {
    const address = group.location?.trim()
    if (!address) {
      setMeetingCoordinate(null)
      setMapError('저장된 만나는 장소가 없습니다.')
      return
    }

    let cancelled = false
    setMapLoading(true)
    setMapError('')
    Location.geocodeAsync(address)
      .then((results) => {
        if (cancelled) return
        const result = results[0]
        if (!result || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) {
          setMeetingCoordinate(null)
          setMapError('저장된 주소에서 위치를 찾지 못했습니다.')
          return
        }
        setMeetingCoordinate({ latitude: result.latitude, longitude: result.longitude })
      })
      .catch((error) => {
        console.warn('모임 장소 지도 조회 실패:', error)
        if (!cancelled) {
          setMeetingCoordinate(null)
          setMapError('장소 지도를 불러오지 못했습니다.')
        }
      })
      .finally(() => {
        if (!cancelled) setMapLoading(false)
      })

    return () => { cancelled = true }
  }, [group.location])

  const updateField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: key === 'maxMembers' ? (Number(value) || 0) : value }) as FormState)
  }

  const startEditing = () => {
    setForm(toForm(group))
    setEditing(true)
  }

  const saveChanges = async () => {
    if (!form.title.trim() || !form.event.trim() || !form.location.trim() || !form.meetingDate.trim() || !form.meetingTime.trim()) {
      Alert.alert('입력 확인', '모임명, 행사, 장소, 날짜와 시간은 필수입니다.')
      return
    }
    if (!Number.isInteger(form.maxMembers) || form.maxMembers < 2 || form.maxMembers > 100) {
      Alert.alert('입력 확인', '모집 인원은 2명 이상 100명 이하로 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      const updatedGroup = await updateAppGroup(group.id, {
        ...form,
        title: form.title.trim(),
        event: form.event.trim(),
        location: form.location.trim(),
        content: form.content.trim(),
        condition: form.condition.trim(),
      })
      setGroup((current) => ({
        ...updatedGroup,
        joined: current.joined,
        gathered: current.gathered,
        ownedByMe: current.ownedByMe,
      }))
      setForm(toForm(updatedGroup))
      setEditing(false)
      Alert.alert('완료', '모집글을 수정했습니다.')
    } catch (error) {
      console.error('모집글 수정 실패:', error)
      Alert.alert('안내', '모집글 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = () => Alert.alert('모집글 삭제', '이 모집글을 삭제할까요?', [
    { text: '취소', style: 'cancel' },
    {
      text: '삭제',
      style: 'destructive',
      onPress: async () => {
        setDeleting(true)
        try {
          await deleteAppGroup(group.id)
          setDeleting(false)
          navigation.goBack()
          Alert.alert('완료', '모집글을 삭제했습니다.')
        } catch (error) {
          console.error('모집글 삭제 실패:', error)
          Alert.alert('안내', '모집글 삭제에 실패했습니다.')
        } finally {
          setDeleting(false)
        }
      },
    },
  ])

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ 모임 목록</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>모임 상세</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.statusPill}><Text style={styles.statusText}>{group.status === 'RECRUITING' ? '모집중' : group.status}</Text></View>
          <Text style={styles.title}>{group.title}</Text>
          <Text style={styles.event}>{group.event || '행사 미정'}</Text>
        </View>

        {editing ? (
          <GroupPostFormFields
            value={form}
            onChange={(key, value) => updateField(key, String(value))}
            footer={(
              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => { setEditing(false); setForm(toForm(group)) }}>
                  <Text style={styles.cancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryButton, saving && styles.disabled]} disabled={saving} onPress={saveChanges}>
                  <Text style={styles.primaryText}>{saving ? '저장 중...' : '변경사항 저장'}</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>모임 정보</Text>
              <InfoRow label="날짜와 시간" value={`${group.meetingDate || '미정'} ${group.meetingTime || ''}`} />
              <InfoRow label="참여 인원" value={`${group.currentMembers} / ${group.maxMembers}명`} />
              <InfoRow label="참여 조건" value={group.condition?.trim() || '제한 없음'} />
            </View>
            <View style={styles.mapCard}>
              <Text style={styles.sectionTitle}>만나는 장소</Text>
              <Text style={styles.mapAddress}>{group.location || '장소 미정'}</Text>
              {meetingCoordinate ? (
                <MapView
                  style={styles.detailMap}
                  initialRegion={{ ...meetingCoordinate, latitudeDelta: 0.012, longitudeDelta: 0.012 }}
                  scrollEnabled
                  zoomEnabled
                  rotateEnabled={false}
                  pitchEnabled={false}
                >
                  <Marker coordinate={meetingCoordinate} title={group.title} description={group.location} pinColor="#FF6B35" />
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  {mapLoading ? <ActivityIndicator color="#FF6B35" /> : <Text style={styles.mapError}>{mapError || '지도를 불러오는 중...'}</Text>}
                </View>
              )}
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>모임 소개</Text>
              <Text style={styles.description}>{group.content?.trim() || '등록된 소개가 없습니다.'}</Text>
            </View>
            {group.ownedByMe && (
              <View style={styles.ownerActions}>
                <TouchableOpacity style={styles.primaryButton} onPress={startEditing}>
                  <Text style={styles.primaryText}>모집글 수정</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.deleteButton, deleting && styles.disabled]} onPress={confirmDelete} disabled={deleting}>
                  <Text style={styles.deleteText}>{deleting ? '삭제 중...' : '모집글 삭제'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7FB' },
  header: { minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { minWidth: 90, paddingVertical: 8 },
  backText: { color: '#FF6B35', fontSize: 14, fontWeight: '800' },
  headerTitle: { color: '#1e293b', fontSize: 16, fontWeight: '900' },
  headerSpacer: { minWidth: 90 },
  content: { padding: 16, gap: 14, paddingBottom: 28 },
  hero: { backgroundColor: '#FF6B35', borderRadius: 20, padding: 20 },
  statusPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 10 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  title: { color: '#fff', fontSize: 21, fontWeight: '900' },
  event: { color: '#fff', opacity: 0.9, fontSize: 14, fontWeight: '700', marginTop: 5 },
  card: { backgroundColor: '#fff', borderRadius: 17, padding: 17, gap: 14 },
  mapCard: { backgroundColor: '#fff', borderRadius: 17, padding: 17, gap: 10 },
  mapAddress: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  detailMap: { height: 230, borderRadius: 12 },
  mapPlaceholder: { height: 180, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', padding: 18 },
  mapError: { color: '#64748b', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { color: '#1e293b', fontSize: 15, fontWeight: '900', marginBottom: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoLabel: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  infoValue: { color: '#1e293b', fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  description: { color: '#334155', fontSize: 14, lineHeight: 22 },
  field: { gap: 6 },
  label: { color: '#334155', fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#DDE2EA', backgroundColor: '#fff', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, color: '#1e293b', fontSize: 14 },
  multiline: { minHeight: 100, paddingTop: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: '#DDE2EA', borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: '#fff' },
  cancelText: { color: '#475569', fontSize: 14, fontWeight: '800' },
  primaryButton: { flex: 1, backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  ownerActions: { gap: 10 },
  deleteButton: { borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#fff', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  deleteText: { color: '#DC2626', fontSize: 14, fontWeight: '900' },
  disabled: { backgroundColor: '#C9CDD5' },
})
