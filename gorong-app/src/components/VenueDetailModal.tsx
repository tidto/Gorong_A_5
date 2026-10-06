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
import { applySoloParticipation, cancelSoloParticipation, checkSoloApplied } from '../services/api'
import { parseLooseDate } from '../utils/recommend'
import { Venue } from '../types'
import ReviewSection from './review/ReviewSection'

type Props = {
    venue: Venue | null
    formatPeriod: (start?: string, end?: string) => string
    onClose: () => void
    onShowOnMap: (venue: Venue) => void
    // 혼자 참여 신청/취소가 서버에 반영된 뒤 호출 (MapScreen이 지오펜싱 대상을 갱신)
    onParticipationChange?: (venue: Venue, applied: boolean) => void
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

// 무장애 정보 3종(주차/엘리베이터/화장실)을 사람이 읽을 문장으로
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

// venue.category는 TourAPI cat1 코드(A01~A05) 또는 'EVENT' — 화면에는 한글 라벨로 표시
const CATEGORY_LABELS: Record<string, string> = {
    A01: '자연',
    A02: '문화',
    A03: '레저',
    A04: '쇼핑',
    A05: '음식',
    EVENT: '행사',
}

function getCategoryLabel(category?: string): string | null {
    const key = (category ?? '').toUpperCase()
    return CATEGORY_LABELS[key] ?? CATEGORY_LABELS[key.slice(0, 3)] ?? null
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

// 빠른 실행 버튼 (전화 / 길찾기 / 공유)
function QuickAction({ icon, label, onPress, disabled }: {
    icon: string
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
            <Text style={styles.quickIcon}>{icon}</Text>
            <Text style={styles.quickLabel}>{label}</Text>
        </TouchableOpacity>
    )
}

// 정보 카드의 한 줄 (아이콘 + 라벨 + 값)
function InfoRow({ icon, label, value, muted, divider }: {
    icon: string
    label: string
    value: string
    muted?: boolean
    divider?: boolean
}) {
    return (
        <View style={[styles.row, divider && styles.rowDivider]}>
            <Text style={styles.rowIcon}>{icon}</Text>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.rowText, muted && { color: '#9ca3af' }]}>{value}</Text>
        </View>
    )
}

export default function VenueDetailModal({
                                             venue,
                                             formatPeriod,
                                             onClose,
                                             onShowOnMap,
                                             onParticipationChange,
                                         }: Props) {
    const insets = useSafeAreaInsets()

    // null = 확인 중
    const [soloApplied, setSoloApplied] = useState<boolean | null>(null)
    const [busy, setBusy] = useState(false)
    const [pickerOpen, setPickerOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [expanded, setExpanded] = useState(false) // 소개글 더보기

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

    const barrierFreeLines = buildBarrierFreeLines(venue)
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
    const categoryLabel = getCategoryLabel(venue.category)

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
        <Modal visible={!!venue} animationType="slide" onRequestClose={pickerOpen ? () => setPickerOpen(false) : onClose}>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                    <View style={styles.heroWrap}>
                        <Image
                            source={venue.imageUrl ? { uri: venue.imageUrl } : require('../../assets/icon.png')}
                            style={styles.hero}
                        />
                        <View style={styles.heroShade} pointerEvents="none" />
                        {/* 닫기 버튼 — 상태바 겹침 방지로 safe area 반영 */}
                        <TouchableOpacity
                            style={[styles.closeBtn, { top: insets.top + 10 }]}
                            onPress={onClose}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel="상세페이지 닫기"
                        >
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 본문 시트: 사진 위로 살짝 겹쳐 올라오는 둥근 카드 */}
                    <View style={styles.body}>
                        <View style={styles.badgeRow}>
                            {categoryLabel ? (
                                <View style={styles.categoryBadge}>
                                    <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
                                </View>
                            ) : null}
                            {status && (
                                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                                    <Text style={[styles.statusBadgeText, { color: status.color }]}>{status.label}</Text>
                                </View>
                            )}
                            {soloApplied === true && (
                                <View style={styles.appliedBadge} accessibilityLabel="혼자 참여 신청됨">
                                    <Text style={styles.appliedBadgeText}>✅ 참여 신청됨</Text>
                                </View>
                            )}
                        </View>

                        <Text style={styles.title}>{venue.name}</Text>

                        <View style={styles.quickRow}>
                            <QuickAction
                                icon="📞"
                                label="전화"
                                disabled={!venue.tel}
                                onPress={() => venue.tel && Linking.openURL(`tel:${venue.tel}`)}
                            />
                            <QuickAction
                                icon="🧭"
                                label="길찾기"
                                disabled={!canRoute}
                                onPress={() => openKakaoRoute(venue)}
                            />
                            <QuickAction
                                icon="📤"
                                label="공유"
                                onPress={() => Share.share({ message: `${venue.name}\n${venue.address}` })}
                            />
                        </View>

                        <View style={styles.infoCard}>
                            <InfoRow
                                icon="📅"
                                label="기간"
                                value={formatPeriod(venue.eventStartDate, venue.eventEndDate)}
                                muted={!hasPeriod}
                            />
                            <InfoRow icon="📍" label="장소" value={venue.address} divider />
                            <InfoRow icon="🚩" label="도착 인증" value={arrivalText} divider />
                        </View>

                        {barrierFreeLines.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>♿ 편의 정보</Text>
                                <View style={styles.accessCard}>
                                    {barrierFreeLines.map((line, i) => (
                                        <Text key={i} style={styles.accessText}>• {line}</Text>
                                    ))}
                                </View>
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
                                        accessibilityRole="button"
                                        accessibilityLabel={expanded ? '소개 접기' : '소개 더보기'}
                                    >
                                        <Text style={styles.moreText}>{expanded ? '접기 ▲' : '더보기 ▼'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : null}

                        {/* 리뷰 목록 (읽기 전용) — 소개 영역 뒤, 빈 안내 문구 앞 */}
                        <ReviewSection eventId={venue.id} />

                        {!venue.overview && barrierFreeLines.length === 0 && (
                            <Text style={styles.emptyNote}>등록된 상세 소개가 아직 없어요.</Text>
                        )}
                    </View>
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                    <TouchableOpacity
                        style={styles.mapBtn}
                        onPress={() => onShowOnMap(venue)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="지도에서 보기"
                    >
                        <Text style={styles.mapBtnText}>지도에서 보기</Text>
                    </TouchableOpacity>
                    {renderParticipationButton()}
                </View>

                {/* 방문 예정일 선택 — 모달 안에 모달을 또 띄우면 iOS에서 불안정해서 오버레이 View로 구현 */}
                {pickerOpen && (
                    <View style={styles.pickerBackdrop}>
                        <View style={[styles.pickerCard, { marginBottom: insets.bottom + 16 }]}>
                            <Text style={styles.pickerTitle}>📅 방문 예정일을 알려주세요</Text>
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
    heroWrap: { width: '100%', height: 260, backgroundColor: '#f3f4f6' },
    heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)' },
    hero: { width: '100%', height: '100%' },
    closeBtn: {
        position: 'absolute',
        right: 14,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(17,24,39,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    body: {
        marginTop: -24,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 28,
    },
    title: { marginTop: 10, fontSize: 22, lineHeight: 30, fontWeight: '800', color: '#111827' },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    categoryBadge: { backgroundColor: '#FFF1EA', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    categoryBadgeText: { fontSize: 12, fontWeight: '800', color: '#FF6B35' },
    statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    statusBadgeText: { fontSize: 12, fontWeight: '800' },
    quickRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
    quickBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        backgroundColor: '#fff',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
    },
    quickBtnDisabled: { opacity: 0.4 },
    quickIcon: { fontSize: 20 },
    quickLabel: { marginTop: 4, fontSize: 12, fontWeight: '700', color: '#374151' },
    infoLabel: { width: 56, fontSize: 12, fontWeight: '700', color: '#9ca3af' },
    accessCard: { backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14, gap: 6 },
    accessText: { fontSize: 13, color: '#166534', lineHeight: 19 },
    moreText: { marginTop: 8, fontSize: 13, fontWeight: '800', color: '#FF6B35' },
    appliedBadge: {
        backgroundColor: '#ecfdf5',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    appliedBadgeText: { fontSize: 13, fontWeight: '700', color: '#047857' },
    infoCard: {
        marginTop: 18,
        backgroundColor: '#f9fafb',
        borderRadius: 14,
        paddingHorizontal: 14,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb' },
    rowIcon: { fontSize: 15 },
    routeBtn: {
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: '#FF6B35',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    routeBtnText: { color: '#FF6B35', fontWeight: '800', fontSize: 12 },
    emptyNote: { marginTop: 28, textAlign: 'center', fontSize: 13, color: '#9ca3af' },
    rowText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
    linkText: { color: '#2563eb', fontWeight: '700' },
    section: { marginTop: 22 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 8 },
    sectionText: { fontSize: 13, color: '#4b5563', lineHeight: 19 },
    overview: { fontSize: 14, color: '#374151', lineHeight: 21 },
    footer: {
        flexDirection: 'row',
        gap: 10,
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    // '지도에서 보기' — 보조 버튼(테두리형)으로 내리고, 참여 버튼을 주 버튼으로
    mapBtn: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#FF6B35',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapBtnText: { color: '#FF6B35', fontWeight: '800', fontSize: 15 },
    primaryBtn: {
        flex: 1,
        backgroundColor: '#FF6B35',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    cancelBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#dc2626' },
    cancelBtnText: { color: '#dc2626', fontWeight: '800', fontSize: 15 },
    btnDisabled: { backgroundColor: '#9ca3af' },
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
    pickerTitle: { fontSize: 17, fontWeight: '800', color: '#111827', textAlign: 'center' },
    pickerSub: { marginTop: 6, fontSize: 13, color: '#6b7280', textAlign: 'center' },
    pickerScroll: { marginTop: 16, maxHeight: 240 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 9,
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