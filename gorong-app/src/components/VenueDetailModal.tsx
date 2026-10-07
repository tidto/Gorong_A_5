// ─────────────────────────────────────────────────────────────────
// VenueDetailModal.tsx — 행사/장소 상세페이지
// MapScreen 위에 전체화면 모달로 뜸 (별도 네비게이션 스택 없이 사용 가능)
//
// [추가] 혼자 참여 신청/취소 (웹 EventDetail과 동일한 백엔드 API 사용)
//   - 모달이 열릴 때 /solo/check 로 신청 여부 확인
//   - 신청: 방문 예정일 선택 → POST /solo  (visitDate = yyyy-MM-dd)
//   - 취소: DELETE /solo
//   - 성공하면 onParticipationChange 로 MapScreen에 알려 지오펜싱 대상을 즉시 갱신
// ─────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { applySoloParticipation, cancelSoloParticipation, checkSoloApplied } from '../services/api'
import { parseLooseDate } from '../utils/recommend'
import { Venue } from '../types'
import ReviewSection from './review/ReviewSection'
import { getAccessibilityGroups } from '../utils/accessibility'

type Props = {
    venue: Venue | null
    // 무장애 정보·소개를 서버에서 보강하는 중이면 true (빈 상태 문구 대신 로딩 표시)
    detailLoading?: boolean
    formatPeriod: (start?: string, end?: string) => string
    onClose: () => void
    onShowOnMap: (venue: Venue) => void
    // 혼자 참여 신청/취소가 서버에 반영된 뒤 호출 (MapScreen이 지오펜싱 대상을 갱신)
    onParticipationChange?: (venue: Venue, applied: boolean) => void
}

// 사진 위 그림자: 겹당 1%만 어둡게 하고 24/16겹을 쌓아 단계(밴딩)가 눈에 안 보이게 함
const HERO_SHADE_BOTTOM = Array.from({ length: 24 }, (_, i) => (i + 1) * 5)
const HERO_SHADE_TOP = Array.from({ length: 16 }, (_, i) => (i + 1) * 7)

// 요약 칩에 먼저 보여줄 무장애 항목 순서 (앞쪽일수록 우선) — 팀에서 기준이 정해지면 이 배열만 수정
const ACCESS_PRIORITY = [
    'route', 'exit', 'restroom', 'elevator', 'wheelchair',
    'braileBlock', 'audioGuide', 'helpDog', 'signGuide', 'videoGuide',
    'stroller', 'parking', 'publicTransport',
]
const accessRank = (field: string) => {
    const i = ACCESS_PRIORITY.indexOf(field)
    return i === -1 ? ACCESS_PRIORITY.length : i
}

// 날짜 선택 칩 최대 개수 (기간이 긴 행사/상설 관광지는 오늘부터 이만큼만 보여줌)
const MAX_DATE_OPTIONS = 60
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function startOfToday() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

function addDays(base: Date, days: number) {
    const d = new Date(base)
    d.setDate(d.getDate() + days)
    return d
}

// 로컬 기준 yyyy-MM-dd (toISOString()은 UTC라 KST 오전 9시 전에 하루 전 날짜가 나옴)
function toYmd(d: Date) {
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
}

// 방문 예정일 후보: [max(오늘, 행사 시작일) ~ 행사 종료일], 최대 MAX_DATE_OPTIONS일
function buildDateOptions(venue: Venue): { value: string; label: string }[] {
    const today = startOfToday()
    const start = parseLooseDate(venue.eventStartDate)
    const end = parseLooseDate(venue.eventEndDate)
    const from = start && start > today ? start : today
    const cap = addDays(from, MAX_DATE_OPTIONS - 1)
    const to = end && end < cap ? end : cap
    const options: { value: string; label: string }[] = []
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
        options.push({
            value: toYmd(d),
            label: `${d.getMonth() + 1}/${d.getDate()} (${WEEKDAYS[d.getDay()]})`,
        })
    }
    return options
}

// [레거시 폴백] venue.accessibility 가 없고 barrierFreeInfo(문자열)만 있을 때(/venues/nearby 응답)만 사용
function buildBarrierFreeLines(venue: Venue): string[] {
    const lines: string[] = []
    if (venue.barrierFreeInfo) {
        // 백엔드가 이미 합쳐서 내려주는 경우 그대로 사용
        return venue.barrierFreeInfo.split('\n').filter(Boolean)
    }
    return lines
}

// 카카오맵 링크 이름에 쓰면 안 되는 문자 제거 (웹 EventDetail의 toKakaoLinkName과 동일 규칙)
function toKakaoLinkName(name?: string) {
    const safe = (name || '행사 위치').replace(/[/?#&=,]/g, ' ').replace(/\s+/g, ' ').trim()
    return safe || '행사 위치'
}

async function openKakaoRoute(venue: Venue) {
    const url = `https://map.kakao.com/link/to/${encodeURIComponent(toKakaoLinkName(venue.name))},${venue.lat},${venue.lng}`
    try {
        await Linking.openURL(url)
    } catch (e: any) {
        console.warn('[route] 길찾기 열기 실패:', e?.message)
        Alert.alert('길찾기를 열 수 없어요', '브라우저나 카카오맵을 열지 못했습니다.')
    }
}

// 행사 상태 배지: 종료 / 진행 중 / D-n(시작 전)
function getStatusBadge(venue: Venue): { label: string; bg: string; color: string } | null {
    const today = startOfToday()
    const start = parseLooseDate(venue.eventStartDate)
    const end = parseLooseDate(venue.eventEndDate)
    if (end && end < today) return { label: '종료', bg: '#f3f4f6', color: '#6b7280' }
    if (start && start > today) {
        const diff = Math.ceil((start.getTime() - today.getTime()) / 86400000)
        return { label: `D-${diff}`, bg: '#eff6ff', color: '#2563eb' }
    }
    if (start || end) return { label: '진행 중', bg: '#ecfdf5', color: '#047857' }
    return null
}

// 무장애 그룹 아이콘 — accessibility.ts 의 이모지 대신 key 로 매핑 (util 은 웹과 공유하는 기준이라 그대로 둠)
function GroupIcon({ groupKey }: { groupKey: string }) {
    const color = '#ea580c'
    switch (groupKey) {
        case 'mobility':
            return <MaterialCommunityIcons name="wheelchair-accessibility" size={16} color={color} />
        case 'visual':
            return <Ionicons name="eye-outline" size={16} color={color} />
        case 'hearing':
            return <Ionicons name="ear-outline" size={16} color={color} />
        default:
            return <MaterialCommunityIcons name="baby-carriage" size={16} color={color} />
    }
}

// 빠른 실행 버튼 (전화 / 길찾기 / 공유)
function QuickAction({ icon, label, onPress, disabled }: {
    icon: React.ReactNode
    label: string
    onPress: () => void
    disabled?: boolean
}) {
    return (
        <TouchableOpacity
            style={[styles.quickBtn, disabled && styles.quickBtnDisabled]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            {icon}
            <Text style={styles.quickLabel}>{label}</Text>
        </TouchableOpacity>
    )
}

// 정보 목록의 한 줄 (아이콘 타일 + 라벨 + 값)
function InfoRow({ icon, label, value, muted, divider }: {
    icon: React.ReactNode
    label: string
    value: string
    muted?: boolean
    divider?: boolean
}) {
    return (
        <View style={[styles.row, divider && styles.rowDivider]}>
            <View style={styles.rowIconTile}>
                {icon}
            </View>
            <View style={styles.rowBody}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={[styles.rowText, muted && { color: '#6b7280' }]}>{value}</Text>
            </View>
        </View>
    )
}

export default function VenueDetailModal({
                                             venue,
                                             formatPeriod,
                                             onClose,
                                             onShowOnMap,
                                             onParticipationChange,
                                             detailLoading,
                                         }: Props) {
    const insets = useSafeAreaInsets()

    // null = 확인 중
    const [soloApplied, setSoloApplied] = useState<boolean | null>(null)
    const [busy, setBusy] = useState(false)
    const [pickerOpen, setPickerOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [expanded, setExpanded] = useState(false) // 소개글 더보기
    const [scrolled, setScrolled] = useState(false) // 사진이 화면 밖으로 나가면 상태바 뒤에 흰 막을 깜

    // 요청이 끝났을 때 모달이 다른 행사로 바뀌었는지 확인하기 위한 ref
    const currentVenueIdRef = useRef<string | null>(null)
    currentVenueIdRef.current = venue?.id ?? null

    // 행사가 바뀔 때마다 신청 여부 조회 (미로그인/네트워크 실패는 '미신청'으로 간주 — 중복이면 409로 바로잡힘)
    useEffect(() => {
        if (!venue?.id) return undefined
        let cancelled = false
        setSoloApplied(null)
        setPickerOpen(false)
        setSelectedDate(null)
        setExpanded(false)
        setScrolled(false)
        checkSoloApplied(venue.id)
            .then((res) => {
                if (!cancelled) setSoloApplied(Boolean(res.data?.applied))
            })
            .catch((e) => {
                console.warn('[solo] 신청 여부 조회 실패:', e?.response?.status ?? e?.message)
                if (!cancelled) setSoloApplied(false)
            })
        return () => {
            cancelled = true
        }
    }, [venue?.id])

    const dateOptions = useMemo(() => (venue ? buildDateOptions(venue) : []), [venue])

    if (!venue) return null

    const accessGroups = getAccessibilityGroups(venue.accessibility)
    // 항목별 정보가 있으면 그룹 배지로, 없을 때만 기존 문자열 방식으로 표시
    const barrierFreeLines = accessGroups.length === 0 ? buildBarrierFreeLines(venue) : []
    const hasAccess = accessGroups.length > 0 || barrierFreeLines.length > 0
    const hasGeofence = venue.geofenceEnabled !== false && venue.radius > 0
    const hasPeriod = Boolean(venue.eventStartDate || venue.eventEndDate)
    const canRoute = Number.isFinite(venue.lat) && Number.isFinite(venue.lng)
    // '지오펜싱'은 개발 용어라 사용자에게는 '도착 인증'으로 안내
    const arrivalText = hasGeofence
        ? `반경 ${venue.radius}m 이내 자동 인증`
        : '혼자 참여를 신청하면 도착 인증을 할 수 있어요'

    // 종료된 행사는 신청 불가 (백엔드는 날짜 검증을 하지 않으므로 앱에서 막음)
    const endDate = parseLooseDate(venue.eventEndDate)
    const isEnded = endDate !== null && endDate < startOfToday()
    const status = getStatusBadge(venue)

    // 무장애 요약 (상단 칩): 전체 개수 + 앞 4개 라벨만 노출, 나머지는 +N
    const accessTotal = accessGroups.reduce((n, g) => n + g.items.length, 0)
    const accessPreview = accessGroups
        .flatMap((g) => g.items)
        .sort((a, b) => accessRank(a.field) - accessRank(b.field))
        .slice(0, 4)
        .map((i) => i.label)
    const accessMore = accessTotal - accessPreview.length

    const openPicker = () => {
        setSelectedDate(dateOptions[0]?.value ?? null)
        setPickerOpen(true)
    }

    const handleApply = async () => {
        if (!selectedDate || busy) return
        const target = venue
        setBusy(true)
        try {
            await applySoloParticipation({
                eventContentId: target.id,
                eventTitle: target.name,
                visitDate: selectedDate,
            })
            onParticipationChange?.(target, true)
            if (currentVenueIdRef.current !== target.id) return
            setSoloApplied(true)
            setPickerOpen(false)
            Alert.alert('참여 신청 완료', `${selectedDate} 방문 예정으로 신청했어요.`)
        } catch (e: any) {
            const status = e?.response?.status
            if (status === 409) {
                // 이미 신청된 상태 → 화면만 바로잡음
                onParticipationChange?.(target, true)
                if (currentVenueIdRef.current === target.id) {
                    setSoloApplied(true)
                    setPickerOpen(false)
                }
                Alert.alert('이미 신청한 행사예요', '혼자 참여 신청이 되어 있습니다.')
            } else if (status === 401) {
                Alert.alert('로그인이 필요합니다', '다시 로그인한 뒤 시도해 주세요.')
            } else {
                console.warn('[solo] 신청 실패:', status ?? e?.message)
                Alert.alert('오류', '참여 신청 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.')
            }
        } finally {
            setBusy(false)
        }
    }

    const doCancel = async () => {
        if (busy) return
        const target = venue
        setBusy(true)
        try {
            await cancelSoloParticipation(target.id)
            onParticipationChange?.(target, false)
            if (currentVenueIdRef.current === target.id) setSoloApplied(false)
        } catch (e: any) {
            const status = e?.response?.status
            if (status === 404) {
                // 서버에 이미 내역이 없음 → 화면만 바로잡음
                onParticipationChange?.(target, false)
                if (currentVenueIdRef.current === target.id) setSoloApplied(false)
            } else if (status === 401) {
                Alert.alert('로그인이 필요합니다', '다시 로그인한 뒤 시도해 주세요.')
            } else {
                console.warn('[solo] 취소 실패:', status ?? e?.message)
                Alert.alert('오류', '참여 취소 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.')
            }
        } finally {
            setBusy(false)
        }
    }

    const handleCancel = () => {
        Alert.alert('참여 취소', '혼자 참여 신청을 취소할까요?', [
            { text: '아니요', style: 'cancel' },
            { text: '취소하기', style: 'destructive', onPress: doCancel },
        ])
    }

    // 참여 버튼 (상태별)
    const renderParticipationButton = () => {
        if (soloApplied === null) {
            return (
                <View style={[styles.primaryBtn, styles.btnDisabled]} accessibilityLabel="참여 여부 확인 중">
                    <ActivityIndicator color="#fff" />
                </View>
            )
        }
        if (soloApplied) {
            return (
                <TouchableOpacity
                    style={[styles.primaryBtn, styles.cancelBtn]}
                    onPress={handleCancel}
                    disabled={busy}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="혼자 참여 신청 취소"
                >
                    {busy ? <ActivityIndicator color="#dc2626" /> : <Text style={styles.cancelBtnText}>참여 취소</Text>}
                </TouchableOpacity>
            )
        }
        if (isEnded) {
            return (
                <View style={[styles.primaryBtn, styles.btnDisabled]} accessibilityLabel="종료된 행사라 참여 신청 불가">
                    <Text style={styles.primaryBtnText}>종료된 행사</Text>
                </View>
            )
        }
        return (
            <TouchableOpacity
                style={styles.primaryBtn}
                onPress={openPicker}
                disabled={busy}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="혼자 참여 신청"
            >
                <Text style={styles.primaryBtnText}>혼자 참여 신청</Text>
            </TouchableOpacity>
        )
    }

    return (
        <Modal visible={!!venue} animationType="slide" statusBarTranslucent onRequestClose={pickerOpen ? () => setPickerOpen(false) : onClose}>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <ScrollView
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={(e) => {
                        // 값이 바뀔 때만 state 갱신 (스크롤마다 리렌더 방지)
                        const next = e.nativeEvent.contentOffset.y > 300 - insets.top - 8
                        setScrolled((prev) => (prev === next ? prev : next))
                    }}
                >
                    <View style={styles.heroWrap}>
                        <Image
                            source={venue.imageUrl ? { uri: venue.imageUrl } : require('../../assets/icon.png')}
                            style={styles.hero}
                        />
                        {/* 위/아래 그라데이션 대용 (expo-linear-gradient 없이 반투명 View 겹침) */}
                        {HERO_SHADE_BOTTOM.map((h) => (
                            <View key={`b${h}`} pointerEvents="none" style={[styles.heroShade, { bottom: 0, height: h }]} />
                        ))}
                        {HERO_SHADE_TOP.map((h) => (
                            <View key={`t${h}`} pointerEvents="none" style={[styles.heroShade, { top: 0, height: h }]} />
                        ))}
                        {/* 닫기 버튼 — 상태바 겹침 방지로 safe area 반영 */}
                        <TouchableOpacity
                            style={[styles.closeBtn, { top: insets.top + 10 }]}
                            onPress={onClose}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            accessibilityLabel="상세페이지 닫기"
                        >
                            <Ionicons name="close" size={20} color="#fff" />
                        </TouchableOpacity>
                        {/* 배지는 사진 위 좌하단으로 올려 본문 첫 줄을 제목에 쓴다 */}
                        <View style={styles.heroBadges}>
                            {status && (
                                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                    <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                                </View>
                            )}
                            {soloApplied === true && (
                                <View style={styles.appliedBadge} accessibilityLabel="혼자 참여 신청됨">
                                    <Ionicons name="checkmark-circle" size={14} color="#047857" />
                                    <Text style={styles.appliedBadgeText}>참여 신청됨</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* 본문 시트: 사진 위로 살짝 겹쳐 올라오는 둥근 카드 */}
                    <View style={styles.body}>
                        <Text style={styles.title}>{venue.name}</Text>
                        <View style={styles.addressRow}>
                            <Ionicons name="location-outline" size={15} color="#6b7280" style={{ marginTop: 2 }} />
                            <Text style={styles.addressLine} numberOfLines={2}>{venue.address}</Text>
                        </View>

                        {/* 무장애 요약 — 이 앱의 핵심 정보라 스크롤 없이 첫 화면에서 보이게 올림 */}
                        {accessTotal > 0 && (
                            <View
                                style={styles.accessSummary}
                                accessible
                                accessibilityLabel={`무장애 편의 ${accessTotal}개: ${accessPreview.join(', ')}`}
                            >
                                <View style={styles.accessSummaryHead}>
                                    <MaterialCommunityIcons name="wheelchair-accessibility" size={18} color="#166534" />
                                    <Text style={styles.accessSummaryTitle}>무장애 편의 {accessTotal}개 확인됨</Text>
                                </View>
                                <View style={styles.accessChipWrap}>
                                    {accessPreview.map((label) => (
                                        <View key={label} style={styles.accessChip}>
                                            <Text style={styles.accessChipText}>{label}</Text>
                                        </View>
                                    ))}
                                    {accessMore > 0 && (
                                        <View style={[styles.accessChip, styles.accessChipMore]}>
                                            <Text style={styles.accessChipText}>+{accessMore}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* 빠른 실행: 카드 3개 → 구분선 있는 한 줄 바 */}
                        <View style={styles.quickRow}>
                            <QuickAction
                                icon={<Ionicons name="call" size={22} color="#FF6B35" />}
                                label="전화"
                                disabled={!venue.tel}
                                onPress={() => venue.tel && Linking.openURL(`tel:${venue.tel}`)}
                            />
                            <View style={styles.quickDivider} />
                            <QuickAction
                                icon={<Ionicons name="navigate" size={22} color="#FF6B35" />}
                                label="길찾기"
                                disabled={!canRoute}
                                onPress={() => openKakaoRoute(venue)}
                            />
                            <View style={styles.quickDivider} />
                            <QuickAction
                                icon={<Ionicons name="share-social" size={22} color="#FF6B35" />}
                                label="공유"
                                onPress={() => Share.share({ message: `${venue.name}\n${venue.address}` })}
                            />
                        </View>

                        <View style={styles.infoList}>
                            <InfoRow
                                icon={<Ionicons name="calendar" size={18} color="#EA580C" />}
                                label="기간"
                                value={formatPeriod(venue.eventStartDate, venue.eventEndDate)}
                                muted={!hasPeriod}
                            />
                            <InfoRow icon={<Ionicons name="flag" size={18} color="#EA580C" />} label="도착 인증" value={arrivalText} divider />
                        </View>

                        {hasAccess && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>무장애 편의 정보</Text>
                                {accessGroups.map((group) => (
                                    <View key={group.key} style={styles.accessGroup}>
                                        <View style={styles.accessGroupHead}>
                                            <GroupIcon groupKey={group.key} />
                                            <Text style={styles.accessGroupTitle}>{group.title}</Text>
                                        </View>
                                        <View style={styles.accessCard}>
                                            {[...group.items].sort((a, b) => accessRank(a.field) - accessRank(b.field)).map((item) => (
                                                <View
                                                    key={item.field}
                                                    style={styles.accessRow}
                                                    accessible
                                                    accessibilityLabel={
                                                        item.description ? `${item.label}, ${item.description}` : item.label
                                                    }
                                                >
                                                    <View style={styles.accessCheckCircle}>
                                                        <Ionicons name="checkmark" size={13} color="#fff" />
                                                    </View>
                                                    <View style={styles.accessBody}>
                                                        <Text style={styles.accessLabel}>{item.label}</Text>
                                                        {item.description ? (
                                                            <Text style={styles.accessDesc}>{item.description}</Text>
                                                        ) : null}
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                                {barrierFreeLines.length > 0 && (
                                    <View style={styles.accessCard}>
                                        {barrierFreeLines.map((line, i) => (
                                            <Text key={i} style={styles.accessText}>• {line}</Text>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {venue.overview ? (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>소개</Text>
                                <Text style={styles.overview} numberOfLines={expanded ? undefined : 6}>
                                    {venue.overview}
                                </Text>
                                {venue.overview.length > 140 && (
                                    <TouchableOpacity
                                        onPress={() => setExpanded((v) => !v)}
                                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 24 }}
                                        accessibilityRole="button"
                                        accessibilityLabel={expanded ? '소개 접기' : '소개 더보기'}
                                    >
                                        <View style={styles.moreRow}>
                                            <Text style={styles.moreText}>{expanded ? '접기' : '더보기'}</Text>
                                            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#FF6B35" />
                                        </View>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : null}

                        {/* 리뷰 목록 (읽기 전용) — 소개 영역 뒤, 빈 안내 문구 앞 */}
                        <ReviewSection eventId={venue.id} />

                        {!venue.overview && !hasAccess && detailLoading && (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color="#9ca3af" />
                                <Text style={styles.emptyNote}>상세 정보를 불러오는 중이에요…</Text>
                            </View>
                        )}

                        {!venue.overview && !hasAccess && !detailLoading && (
                            <Text style={styles.emptyNote}>등록된 상세 소개가 아직 없어요.</Text>
                        )}
                    </View>
                </ScrollView>

                {/* statusBarTranslucent라 본문이 상태바 뒤로 비쳐 보임 → 사진을 지나면 흰 막으로 가림 */}
                {scrolled && <View pointerEvents="none" style={[styles.statusScrim, { height: insets.top }]} />}

                <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                    <TouchableOpacity
                        style={[styles.mapBtn, soloApplied === true && styles.mapBtnPrimary]}
                        onPress={() => onShowOnMap(venue)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="지도에서 보기"
                    >
                        <Text style={[styles.mapBtnText, soloApplied === true && styles.mapBtnTextOn]}>지도에서 보기</Text>
                    </TouchableOpacity>
                    {renderParticipationButton()}
                </View>

                {/* 방문 예정일 선택 — 모달 안에 모달을 또 띄우면 iOS에서 불안정해서 오버레이 View로 구현 */}
                {pickerOpen && (
                    <View style={styles.pickerBackdrop}>
                        <View style={[styles.pickerCard, { marginBottom: insets.bottom + 16 }]}>
                            <View style={styles.pickerTitleRow}>
                                <Ionicons name="calendar-outline" size={20} color="#FF6B35" />
                                <Text style={styles.pickerTitle}>방문 예정일을 알려주세요</Text>
                            </View>
                            <Text style={styles.pickerSub}>언제 이 행사에 방문하실 예정인가요?</Text>

                            {dateOptions.length === 0 ? (
                                <Text style={styles.pickerEmpty}>선택할 수 있는 날짜가 없습니다.</Text>
                            ) : (
                                <ScrollView style={styles.pickerScroll} contentContainerStyle={styles.chipWrap}>
                                    {dateOptions.map((opt) => {
                                        const selected = opt.value === selectedDate
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                style={[styles.chip, selected && styles.chipSelected]}
                                                onPress={() => setSelectedDate(opt.value)}
                                                accessibilityRole="button"
                                                accessibilityLabel={`${opt.label} 선택`}
                                                accessibilityState={{ selected }}
                                            >
                                                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                                                    {opt.label}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </ScrollView>
                            )}

                            <View style={styles.pickerActions}>
                                <TouchableOpacity
                                    style={[styles.pickerBtn, styles.pickerBtnGhost]}
                                    onPress={() => setPickerOpen(false)}
                                    disabled={busy}
                                    accessibilityRole="button"
                                    accessibilityLabel="날짜 선택 취소"
                                >
                                    <Text style={styles.pickerBtnGhostText}>취소</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pickerBtn, (!selectedDate || busy) && styles.btnDisabled]}
                                    onPress={handleApply}
                                    disabled={!selectedDate || busy}
                                    accessibilityRole="button"
                                    accessibilityLabel="참여 신청 확정"
                                >
                                    {busy ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.pickerBtnText}>참여 신청</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    statusScrim: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#fff' },

    // ── 히어로 ──
    heroWrap: { width: '100%', height: 300, backgroundColor: '#f3f4f6' },
    hero: { width: '100%', height: '100%' },
    // 한 장짜리 어두운 막은 경계선이 그대로 보여서, 옅은 막을 겹쳐 경계를 부드럽게 함
    heroShade: { position: 'absolute', left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.011)' },
    closeBtn: {
        position: 'absolute',
        right: 14,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(17,24,39,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    heroBadges: {
        position: 'absolute',
        left: 16,
        bottom: 36,
        right: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
    },
    statusBadge: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
    statusBadgeText: { fontSize: 12, fontWeight: '800' },
    appliedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ecfdf5', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
    appliedBadgeText: { fontSize: 12, fontWeight: '800', color: '#047857' },

    // ── 본문 ──
    body: {
        marginTop: -24,
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 32,
    },
    title: { fontSize: 24, lineHeight: 32, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
    addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6 },
    addressLine: { flex: 1, fontSize: 13, lineHeight: 19, color: '#6b7280' },

    // ── 무장애 요약 ──
    accessSummary: {
        marginTop: 16,
        backgroundColor: '#f0fdf4',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        padding: 14,
    },
    accessSummaryHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    accessSummaryTitle: { fontSize: 13, fontWeight: '800', color: '#166534' },
    accessChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    accessChip: {
        backgroundColor: '#fff',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    accessChipMore: { backgroundColor: '#dcfce7' },
    accessChipText: { fontSize: 12, fontWeight: '700', color: '#166534' },

    // ── 빠른 실행 바 ──
    quickRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        marginTop: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#eef0f3',
        backgroundColor: '#fff',
    },
    quickBtn: { flex: 1, alignItems: 'center', paddingVertical: 13 },
    quickBtnDisabled: { opacity: 0.35 },
    quickDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#e5e7eb', marginVertical: 10 },
    quickIcon: { fontSize: 20 },
    quickLabel: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#374151' },

    // ── 정보 목록 ──
    infoList: { marginTop: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
    rowIconTile: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#FFF1EA',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowIcon: { fontSize: 16 },
    rowBody: { flex: 1 },
    infoLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
    rowText: { marginTop: 2, fontSize: 14, color: '#1f2937', lineHeight: 20, fontWeight: '600' },

    // ── 섹션 공통 ──
    section: { marginTop: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 },

    // ── 무장애 상세 ──
    accessGroup: { marginBottom: 14 },
    accessGroupHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
    accessGroupTitle: { fontSize: 13, fontWeight: '800', color: '#ea580c' },
    accessCard: { backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14, gap: 10 },
    accessText: { fontSize: 13, color: '#166534', lineHeight: 19 },
    accessRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    accessCheckCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#16a34a',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    accessCheck: { fontSize: 11, fontWeight: '900', color: '#fff' },
    accessBody: { flex: 1 },
    accessLabel: { fontSize: 14, fontWeight: '700', color: '#166534', lineHeight: 20 },
    accessDesc: { fontSize: 12, color: '#4b5563', lineHeight: 18, marginTop: 1 },

    // ── 소개 ──
    overview: { fontSize: 14, color: '#374151', lineHeight: 22 },
    moreRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
    moreText: { fontSize: 13, fontWeight: '800', color: '#FF6B35' },
    emptyNote: { marginTop: 28, textAlign: 'center', fontSize: 13, color: '#9ca3af' },
    loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },

    // ── 하단 버튼 ──
    footer: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: -3 },
        elevation: 12,
    },
    // '지도에서 보기' — 보조 버튼(테두리형)으로 내리고, 참여 버튼을 주 버튼으로
    mapBtn: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#FF6B35',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapBtnText: { color: '#FF6B35', fontWeight: '800', fontSize: 15 },
    mapBtnPrimary: { backgroundColor: '#FF6B35' },
    mapBtnTextOn: { color: '#fff' },
    primaryBtn: {
        flex: 1,
        backgroundColor: '#FF6B35',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    cancelBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb' },
    cancelBtnText: { color: '#dc2626', fontWeight: '800', fontSize: 15 },
    btnDisabled: { backgroundColor: '#9ca3af' },

    // ── 방문일 선택 오버레이 ──
    pickerBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
    },
    pickerCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
    },
    pickerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    pickerTitle: { fontSize: 17, fontWeight: '800', color: '#111827', textAlign: 'center' },
    pickerSub: { marginTop: 6, fontSize: 13, color: '#6b7280', textAlign: 'center' },
    pickerScroll: { marginTop: 16, maxHeight: 240 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    chipSelected: { borderColor: '#FF6B35', backgroundColor: '#FF6B35' },
    chipText: { fontSize: 13, fontWeight: '700', color: '#374151' },
    chipTextSelected: { color: '#fff' },
    pickerEmpty: { marginTop: 18, textAlign: 'center', fontSize: 13, color: '#9ca3af' },
    pickerActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    pickerBtn: {
        flex: 1,
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    pickerBtnGhost: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e5e7eb' },
    pickerBtnGhostText: { color: '#6b7280', fontWeight: '800', fontSize: 15 },
})