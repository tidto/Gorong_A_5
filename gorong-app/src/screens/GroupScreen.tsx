import * as ImagePicker from 'expo-image-picker'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppGroup } from '../types'
import { checkArrivalStatus, fetchAppGroups, gatherAppGroup, joinAppGroup, uploadFileToS3 } from '../services/api'

export default function GroupScreen() {
  const [groups, setGroups] = useState<AppGroup[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [arrivalVerifiedByGroupId, setArrivalVerifiedByGroupId] = useState<Record<number, boolean>>({})

  const loadGroups = useCallback(async () => {
    try {
      const response = await fetchAppGroups()
      const items = response.data
      setGroups(items)

      const statuses = await Promise.all(
        items.map(async (group) => {
          if (!group.event) return [group.id, false] as const
          try {
            const res = await checkArrivalStatus(group.event)
            return [group.id, Boolean(res.data?.verified)] as const
          } catch {
            return [group.id, false] as const
          }
        })
      )
      setArrivalVerifiedByGroupId(Object.fromEntries(statuses))
    } catch (error) {
      console.error('그룹 목록 조회 실패:', error)
      Alert.alert('오류', '그룹 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  const handleJoin = async (groupId: number) => {
    try {
      await joinAppGroup(groupId)
      Alert.alert('완료', '그룹에 참가했습니다.')
      loadGroups()
    } catch (error) {
      console.error('그룹 참가 실패:', error)
      Alert.alert('안내', '참가에 실패했습니다. 인원 초과 또는 권한을 확인해주세요.')
    }
  }

  const handleGather = async (groupId: number) => {
    try {
      await gatherAppGroup(groupId)
      Alert.alert('완료', '모였다 인증이 완료되었습니다.')
      loadGroups()
    } catch (error) {
      console.error('모였다 인증 실패:', error)
      Alert.alert('안내', '모였다 인증에 실패했습니다. 인원 충족 여부를 확인해주세요.')
    }
  }

  const handleUploadPhoto = async (group: AppGroup) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.')
        return
      }

      if (!arrivalVerifiedByGroupId[group.id]) {
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
      const uri = asset.uri
      const fileName = asset.fileName ?? `event-${group.event || group.id}-${Date.now()}.jpg`
      const response = await uploadFileToS3(uri, fileName, 'APP_PHOTO', true, group.event)
      Alert.alert('완료', response.data?.gallerySaved ? '행사 사진이 갤러리에 저장되었습니다.' : '사진 업로드가 완료되었습니다.')
      loadGroups()
    } catch (error) {
      console.error('사진 업로드 실패:', error)
      Alert.alert('안내', '사진 업로드에 실패했습니다. 지오펜싱 인증 여부를 확인해주세요.')
    }
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
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true)
          loadGroups()
        }} />
      }
    >
      {groups.map((group) => {
        const isFull = group.currentMembers >= group.maxMembers
        return (
          <View key={group.id} style={styles.card}>
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>모임</Text>
              <Text style={styles.statusBadge}>
                {group.gathered ? '모임 완료' : group.status}
              </Text>
            </View>

            <Text style={styles.eventTitle}>{group.event || '이벤트 미정'}</Text>
            <Text style={styles.groupTitle}>{group.title || '모임 정보'}</Text>
            <Text style={styles.meta}>만나는 장소: {group.location || '미정'}</Text>
            <Text style={styles.meta}>
              만나는 시간: {(group.meetingDate || '미정')} {group.meetingTime || ''}
            </Text>
            <Text style={styles.meta}>
              인원: {group.currentMembers}/{group.maxMembers}
            </Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.button, (group.joined || isFull) && styles.buttonDisabled]}
                disabled={group.joined || isFull}
                onPress={() => handleJoin(group.id)}
              >
                <Text style={styles.buttonText}>{group.joined ? '참가 완료' : isFull ? '정원 마감' : '참가하기'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, (!group.joined || !isFull || group.gathered) && styles.buttonDisabled]}
                disabled={!group.joined || !isFull || group.gathered}
                onPress={() => handleGather(group.id)}
              >
                <Text style={styles.buttonText}>{group.gathered ? '인증 완료' : '모였다 인증'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.secondaryButton, (!group.joined || !arrivalVerifiedByGroupId[group.id]) && styles.buttonDisabled]}
              disabled={!group.joined || !arrivalVerifiedByGroupId[group.id]}
              onPress={() => handleUploadPhoto(group)}
            >
              <Text style={styles.secondaryButtonText}>
                {arrivalVerifiedByGroupId[group.id] ? '행사 사진 올리기' : '지오펜싱 인증 후 업로드'}
              </Text>
            </TouchableOpacity>
          </View>
        )
      })}
      {groups.length === 0 && (
        <View style={styles.center}>
          <Text>표시할 그룹이 없습니다.</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F7FB' },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
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
  secondaryButton: {
    marginTop: 10,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
})
