import React, { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native'
import * as Location from 'expo-location'
import MapView, { Marker, type Region } from 'react-native-maps'
import { fetchPublicEvents, type CreateAppGroupPayload } from '../services/api'
import type { PublicEvent } from '../types'

export type GroupPostFormValues = Omit<CreateAppGroupPayload, 'maxMembers'> & { maxMembers: string | number }
type FieldKey = keyof GroupPostFormValues

interface Props {
  value: GroupPostFormValues
  onChange: (key: FieldKey, value: string | number) => void
  footer?: ReactNode
}

export default function GroupPostFormFields({ value, onChange, footer }: Props) {
  const [picker, setPicker] = useState<'event' | 'location' | 'date' | 'time' | null>(null)
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState('')
  const [eventSearch, setEventSearch] = useState('')
  const [locationCandidate, setLocationCandidate] = useState('')
  const [locationResolving, setLocationResolving] = useState(false)
  const addressRequestId = useRef(0)
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [pickedCoordinate, setPickedCoordinate] = useState<{ latitude: number; longitude: number } | null>(null)
  const [placeQuery, setPlaceQuery] = useState('')
  const [searchingPlace, setSearchingPlace] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [timeDraft, setTimeDraft] = useState({ hour: '12', minute: '00' })

  const filteredEvents = useMemo(() => {
    const keyword = eventSearch.trim().toLocaleLowerCase()
    if (!keyword) return events
    return events.filter((event) => `${event.title} ${event.addr1}`.toLocaleLowerCase().includes(keyword))
  }, [events, eventSearch])

  const openEventPicker = async () => {
    setPicker('event')
    setEventSearch('')
    setEventsError('')
    if (events.length) return
    setEventsLoading(true)
    try {
      const response = await fetchPublicEvents()
      setEvents(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('행사 목록 조회 실패:', error)
      setEventsError('행사 목록을 불러오지 못했습니다. 다시 시도해주세요.')
    } finally {
      setEventsLoading(false)
    }
  }

  const selectEvent = (event: PublicEvent) => {
    onChange('event', event.title)
    onChange('eventContentId', event.contentid)
    const lat = Number(event.mapy)
    const lng = Number(event.mapx)
    setMapCenter(Number.isFinite(lat) && Number.isFinite(lng) && lat && lng ? { lat, lng } : null)
    setPicker(null)
  }

  const openLocationPicker = () => {
    addressRequestId.current += 1
    setLocationResolving(false)
    setLocationCandidate(value.location)
    setPickedCoordinate(null)
    setPlaceQuery('')
    setPicker('location')
  }

  const formatCoordinateAddress = async (coordinate: { latitude: number; longitude: number }) => {
    try {
      const [address] = await Location.reverseGeocodeAsync(coordinate)
      if (!address) return ''
      const street = [address.street, address.streetNumber].filter(Boolean).join(' ')
      const addressParts = [address.region, address.city, address.district, street]
          .filter((part): part is string => Boolean(part?.trim()))
      const completeAddress = Array.from(new Set(addressParts)).join(' ')
      return completeAddress || address.name || ''
    } catch (error) {
      console.warn('선택한 위치의 주소 조회 실패:', error)
      return ''
    }
  }

  const selectMapCoordinate = async (coordinate: { latitude: number; longitude: number }) => {
    const requestId = ++addressRequestId.current
    setPickedCoordinate(coordinate)
    setLocationResolving(true)
    setLocationCandidate('주소 확인 중...')
    const address = await formatCoordinateAddress(coordinate)
    if (requestId !== addressRequestId.current) return
    setLocationCandidate(address)
    setLocationResolving(false)
    if (!address) Alert.alert('주소 확인 실패', '주소를 찾지 못했습니다. 장소명이나 주소를 검색해 선택해주세요.')
  }

  const searchPlace = async () => {
    const keyword = placeQuery.trim()
    if (!keyword) return
    setSearchingPlace(true)
    try {
      const results = await Location.geocodeAsync(keyword)
      const result = results[0]
      if (!result) {
        Alert.alert('검색 결과 없음', '장소명이나 주소를 다시 확인해주세요.')
        return
      }
      await selectMapCoordinate({ latitude: result.latitude, longitude: result.longitude })
    } catch (error) {
      console.error('장소 검색 실패:', error)
      Alert.alert('검색 실패', '장소를 찾지 못했습니다. 검색어를 바꾸거나 지도에서 위치를 눌러주세요.')
    } finally {
      setSearchingPlace(false)
    }
  }

  const confirmLocation = () => {
    if (locationResolving || !locationCandidate.trim() || locationCandidate === '주소 확인 중...') return
    onChange('location', locationCandidate.trim())
    setPicker(null)
  }

  const openDatePicker = () => {
    const selected = parseLocalDate(value.meetingDate)
    setCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
    setPicker('date')
  }

  const openTimePicker = () => {
    const match = value.meetingTime.match(/^(\d{1,2}):(\d{2})$/)
    setTimeDraft(match ? { hour: match[1].padStart(2, '0'), minute: match[2] } : { hour: '12', minute: '00' })
    setPicker('time')
  }

  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const day = index - monthStart.getDay() + 1
    return day < 1 || day > daysInMonth ? null : new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
  })

  if (picker === 'date') {
    const selectedDate = parseLocalDate(value.meetingDate)
    return (
      <View style={styles.pickerPage}>
        <PickerHeader title="날짜 선택" onBack={() => setPicker(null)} />
        <View style={styles.monthHeader}>
          <TouchableOpacity style={styles.monthArrow} onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}><Text style={styles.monthArrowText}>‹</Text></TouchableOpacity>
          <Text style={styles.monthTitle}>{calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월</Text>
          <TouchableOpacity style={styles.monthArrow} onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}><Text style={styles.monthArrowText}>›</Text></TouchableOpacity>
        </View>
        <View style={styles.calendarGrid}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
          {calendarCells.map((date, index) => {
            const selected = Boolean(date && date.toDateString() === selectedDate.toDateString())
            return date ? (
              <TouchableOpacity key={index} style={[styles.dayCell, selected && styles.daySelected]} onPress={() => { onChange('meetingDate', formatLocalDate(date)); setPicker(null) }}>
                <Text style={[styles.dayText, selected && styles.daySelectedText]}>{date.getDate()}</Text>
              </TouchableOpacity>
            ) : <View key={index} style={styles.dayCell} />
          })}
        </View>
        <Text style={styles.pickerHint}>선택한 날짜: {value.meetingDate || '날짜를 선택해주세요.'}</Text>
      </View>
    )
  }

  if (picker === 'time') {
    return (
      <View style={styles.pickerPage}>
        <PickerHeader title="시간 선택" onBack={() => setPicker(null)} />
        <Text style={styles.timePreview}>{timeDraft.hour}:{timeDraft.minute}</Text>
        <View style={styles.timeColumns}>
          <View style={styles.timeColumn}>
            <Text style={styles.timeColumnTitle}>시</Text>
            <ScrollView style={styles.timeList} contentContainerStyle={styles.timeOptions}>
              {Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0')).map((hour) => (
                <TouchableOpacity key={hour} style={[styles.timeOption, timeDraft.hour === hour && styles.timeOptionSelected]} onPress={() => setTimeDraft((current) => ({ ...current, hour }))}>
                  <Text style={[styles.timeOptionText, timeDraft.hour === hour && styles.timeOptionTextSelected]}>{hour}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.timeColumn}>
            <Text style={styles.timeColumnTitle}>분</Text>
            <ScrollView style={styles.timeList} contentContainerStyle={styles.timeOptions}>
              {Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0')).map((minute) => (
                <TouchableOpacity key={minute} style={[styles.timeOption, timeDraft.minute === minute && styles.timeOptionSelected]} onPress={() => setTimeDraft((current) => ({ ...current, minute }))}>
                  <Text style={[styles.timeOptionText, timeDraft.minute === minute && styles.timeOptionTextSelected]}>{minute}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        <TouchableOpacity style={styles.confirmButton} onPress={() => { onChange('meetingTime', `${timeDraft.hour}:${timeDraft.minute}`); setPicker(null) }}>
          <Text style={styles.confirmText}>이 시간으로 선택</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const fields: { key: FieldKey; label: string; placeholder: string; multiline?: boolean; numeric?: boolean }[] = [
    { key: 'title', label: '모임명 *', placeholder: '예: 함께 둘러볼 분 구해요' },
    { key: 'maxMembers', label: '모집 인원', placeholder: '2~100명', numeric: true },
    { key: 'condition', label: '참여 조건', placeholder: '#초보환영' },
    { key: 'content', label: '모임 소개', placeholder: '함께할 분들에게 전할 내용', multiline: true },
  ]

  if (picker === 'event') {
    return (
      <View style={styles.pickerPage}>
        <PickerHeader title="고롱 행사 선택" onBack={() => setPicker(null)} />
        <TextInput style={styles.search} value={eventSearch} onChangeText={setEventSearch} placeholder="행사명 또는 주소로 검색" />
        {eventsLoading ? <View style={styles.center}><ActivityIndicator color="#FF6B35" /><Text style={styles.hint}>행사 목록을 불러오는 중...</Text></View> : null}
        {!!eventsError && <TouchableOpacity onPress={openEventPicker}><Text style={styles.error}>{eventsError}</Text></TouchableOpacity>}
        {!eventsLoading && !eventsError && filteredEvents.length === 0 && <Text style={styles.empty}>검색 결과가 없습니다.</Text>}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.eventList}>
          {filteredEvents.map((event) => (
            <TouchableOpacity key={event.contentid} style={styles.eventItem} onPress={() => selectEvent(event)}>
              {event.firstimage
                ? <Image source={{ uri: event.firstimage }} style={styles.eventImage} />
                : <View style={styles.eventIcon}><Text>🎟️</Text></View>}
              <View style={styles.eventCopy}>
                <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                <Text style={styles.eventAddress} numberOfLines={2}>📍 {event.addr1 || '장소 정보 없음'}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )
  }

  if (picker === 'location') {
    return (
      <View style={styles.pickerPage}>
        <PickerHeader title="만나는 장소 선택" onBack={() => setPicker(null)} />
        <Text style={styles.mapHint}>장소를 검색하거나 지도를 눌러 만날 위치를 선택하세요.</Text>
        <View style={styles.mapSearchRow}>
          <TextInput style={[styles.search, styles.mapSearchInput]} value={placeQuery} onChangeText={setPlaceQuery} placeholder="장소명 또는 주소 검색" returnKeyType="search" onSubmitEditing={searchPlace} />
          <TouchableOpacity style={[styles.mapSearchButton, searchingPlace && styles.disabled]} disabled={searchingPlace} onPress={searchPlace}>
            <Text style={styles.mapSearchButtonText}>{searchingPlace ? '검색 중' : '검색'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.mapWrap}>
          <MapView
            style={styles.nativeMap}
            initialRegion={mapCenter
              ? { latitude: mapCenter.lat, longitude: mapCenter.lng, latitudeDelta: 0.035, longitudeDelta: 0.035 }
              : { latitude: 37.5665, longitude: 126.978, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
            onPress={(event) => selectMapCoordinate(event.nativeEvent.coordinate)}
            showsUserLocation={false}
          >
            {pickedCoordinate && <Marker coordinate={pickedCoordinate} title="만나는 장소" description={locationCandidate} pinColor="#FF6B35" />}
          </MapView>
        </View>
        <View style={styles.selectedLocation}>
          <Text style={styles.selectedLabel}>선택한 장소</Text>
          <Text style={styles.selectedValue} numberOfLines={2}>{locationCandidate || '지도의 위치를 선택해주세요.'}</Text>
        </View>
        <TouchableOpacity style={[styles.confirmButton, (!locationCandidate.trim() || locationResolving || locationCandidate === '주소 확인 중...') && styles.disabled]} disabled={!locationCandidate.trim() || locationResolving || locationCandidate === '주소 확인 중...'} onPress={confirmLocation}>
          <Text style={styles.confirmText}>{locationResolving ? '주소 확인 중...' : '이 장소로 선택'}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.form}>
      <View style={styles.field}>
        <Text style={styles.label}>행사명 *</Text>
        <TouchableOpacity style={styles.selector} onPress={openEventPicker}>
          <Text style={[styles.selectorValue, !value.event && styles.placeholder]} numberOfLines={2}>{value.event || '고롱 DB 행사 선택'}</Text>
          <Text style={styles.selectorAction}>행사 찾기 ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>만나는 장소 *</Text>
        <TouchableOpacity style={styles.selector} onPress={openLocationPicker}>
          <Text style={[styles.selectorValue, !value.location && styles.placeholder]} numberOfLines={2}>{value.location || '지도에서 장소 선택'}</Text>
          <Text style={styles.selectorAction}>지도 선택 ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>날짜 *</Text>
        <TouchableOpacity style={styles.selector} onPress={openDatePicker}>
          <Text style={[styles.selectorValue, !value.meetingDate && styles.placeholder]}>{value.meetingDate || '달력에서 날짜 선택'}</Text>
          <Text style={styles.selectorAction}>달력 열기 ›</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>시간 *</Text>
        <TouchableOpacity style={styles.selector} onPress={openTimePicker}>
          <Text style={[styles.selectorValue, !value.meetingTime && styles.placeholder]}>{value.meetingTime || '시간 선택'}</Text>
          <Text style={styles.selectorAction}>시간 고르기 ›</Text>
        </TouchableOpacity>
      </View>
      {fields.map(({ key, label, placeholder, multiline, numeric }) => (
        <View key={key} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.input, multiline && styles.multiline]}
            value={String(value[key] ?? '')}
            onChangeText={(text) => onChange(key, numeric ? (text ? Number(text) : '') : text)}
            placeholder={placeholder}
            keyboardType={numeric ? 'number-pad' : 'default'}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
          />
        </View>
      ))}
      {footer}
    </View>
  )
}

function PickerHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.pickerHeader}>
      <TouchableOpacity onPress={onBack} style={styles.pickerBack}><Text style={styles.pickerBackText}>‹ 뒤로</Text></TouchableOpacity>
      <Text style={styles.pickerTitle}>{title}</Text>
      <View style={styles.pickerBack} />
    </View>
  )
}

function parseLocalDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    if (date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3])) return date
  }
  return new Date()
}

function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const styles = StyleSheet.create({
  form: { gap: 13 },
  field: { gap: 6 },
  label: { color: '#334155', fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#DDE2EA', backgroundColor: '#fff', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, color: '#1e293b', fontSize: 14 },
  multiline: { minHeight: 100, paddingTop: 12 },
  selector: { borderWidth: 1, borderColor: '#DDE2EA', backgroundColor: '#fff', borderRadius: 11, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  selectorValue: { color: '#1e293b', fontSize: 14, fontWeight: '600', flex: 1 },
  placeholder: { color: '#94a3b8', fontWeight: '400' },
  selectorAction: { color: '#FF6B35', fontSize: 12, fontWeight: '800' },
  pickerPage: { flex: 1, minHeight: 500, gap: 10, backgroundColor: '#F6F7FB' },
  pickerHeader: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerBack: { width: 70 },
  pickerBackText: { color: '#FF6B35', fontSize: 13, fontWeight: '800' },
  pickerTitle: { color: '#1e293b', fontSize: 16, fontWeight: '900' },
  monthHeader: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10 },
  monthArrow: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthArrowText: { color: '#FF6B35', fontSize: 28, fontWeight: '700' },
  monthTitle: { color: '#1e293b', fontSize: 16, fontWeight: '900' },
  calendarGrid: { backgroundColor: '#fff', borderRadius: 12, padding: 8, flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', height: 36, textAlign: 'center', textAlignVertical: 'center', color: '#64748b', fontSize: 12, fontWeight: '800' },
  dayCell: { width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: '#FF6B35', borderRadius: 21 },
  dayText: { color: '#1e293b', fontSize: 14, fontWeight: '600' },
  daySelectedText: { color: '#fff', fontWeight: '900' },
  pickerHint: { color: '#64748b', textAlign: 'center', fontSize: 13, fontWeight: '700', paddingVertical: 8 },
  timePreview: { color: '#FF6B35', textAlign: 'center', fontSize: 32, fontWeight: '900', paddingVertical: 8 },
  timeColumns: { flexDirection: 'row', gap: 12, height: 360 },
  timeColumn: { flex: 1, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  timeColumnTitle: { color: '#64748b', textAlign: 'center', fontSize: 13, fontWeight: '800', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#eef0f4' },
  timeList: { height: 310 },
  timeOptions: { padding: 8, gap: 6 },
  timeOption: { minHeight: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f7fb' },
  timeOptionSelected: { backgroundColor: '#FF6B35' },
  timeOptionText: { color: '#334155', fontSize: 14, fontWeight: '700' },
  timeOptionTextSelected: { color: '#fff', fontWeight: '900' },
  search: { minHeight: 44, borderWidth: 1, borderColor: '#DDE2EA', borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#fff', color: '#1e293b' },
  eventList: { maxHeight: 480, gap: 8, paddingBottom: 18 },
  eventItem: { backgroundColor: '#fff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF1E8', alignItems: 'center', justifyContent: 'center' },
  eventImage: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#f1f5f9' },
  eventCopy: { flex: 1, gap: 4 },
  eventTitle: { color: '#1e293b', fontSize: 13, fontWeight: '800' },
  eventAddress: { color: '#64748b', fontSize: 11 },
  chevron: { color: '#94a3b8', fontSize: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  hint: { color: '#64748b', fontSize: 13 },
  error: { color: '#dc2626', padding: 12, textAlign: 'center' },
  empty: { color: '#64748b', padding: 16, textAlign: 'center' },
  mapHint: { color: '#64748b', fontSize: 12 },
  mapSearchRow: { flexDirection: 'row', gap: 7 },
  mapSearchInput: { flex: 1 },
  mapSearchButton: { backgroundColor: '#FF6B35', borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  mapSearchButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  mapWrap: { height: 400, borderRadius: 13, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  nativeMap: { flex: 1 },
  selectedLocation: { backgroundColor: '#fff', borderRadius: 11, padding: 12, gap: 4 },
  selectedLabel: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  selectedValue: { color: '#1e293b', fontSize: 13, fontWeight: '700', minHeight: 18 },
  confirmButton: { backgroundColor: '#FF6B35', borderRadius: 11, paddingVertical: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.45 },
})
