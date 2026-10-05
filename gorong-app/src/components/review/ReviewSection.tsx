// ─────────────────────────────────────────────
// components/review/ReviewSection.tsx
// 행사 상세 모달의 리뷰 목록 섹션 (읽기 전용)
//
// 담당 상태: reviews / loading / loadingMore / error / page / last / total
// 상태관리는 useState + useEffect만 사용한다 (리액트 쿼리 등 추가 의존성 없음).
//
// 페이지네이션: 첫 요청 page=0&size=10 → '10개 더 보기'로 page+1을 기존 목록 뒤에 append.
// 무한 스크롤은 쓰지 않고, last=true면 버튼을 감춘다.
//
// stale 응답 방지: VenueDetailModal의 currentVenueIdRef/cancelled 패턴을 참고해
// 요청 세대 번호(seqRef)를 두어, 행사가 바뀌거나 언마운트된 뒤 도착한 응답은 버린다.
// ─────────────────────────────────────────────
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ReviewSummary } from '../../types/review'
import { REVIEW_PAGE_SIZE, fetchEventReviews, toEventId } from '../../services/reviewApi'
import ReviewCard from './ReviewCard'

type Props = {
    // Venue.id (TourAPI contentid 문자열)
    eventId: string
}

type LoadMode = 'replace' | 'append'

function ReviewSection({ eventId }: Props) {
    const [reviews, setReviews] = useState<ReviewSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(0)
    const [last, setLast] = useState(true)
    const [total, setTotal] = useState(0)

    // 현재 행사 ID (load 콜백이 항상 최신 값을 읽도록 ref로 보관)
    const eventIdRef = useRef(eventId)
    eventIdRef.current = eventId
    // 요청 세대 번호. 값이 달라진 요청의 응답은 버린다.
    const seqRef = useRef(0)

    const load = useCallback(async (targetPage: number, mode: LoadMode) => {
        const id = toEventId(eventIdRef.current)

        // 잘못된 eventId면 요청 자체를 보내지 않는다 (URL에 NaN이 들어가지 않도록)
        if (id === null) {
            seqRef.current += 1
            setReviews([])
            setPage(0)
            setLast(true)
            setTotal(0)
            setLoading(false)
            setLoadingMore(false)
            setError('행사 정보를 확인하지 못해 리뷰를 불러올 수 없어요.')
            return
        }

        const seq = ++seqRef.current
        if (mode === 'replace') {
            setLoading(true)
            setError(null)
        } else {
            setLoadingMore(true)
        }

        try {
            const res = await fetchEventReviews(id, targetPage, REVIEW_PAGE_SIZE)
            if (seq !== seqRef.current) return

            const data = res.data
            const content = Array.isArray(data?.content) ? data.content : []
            const resolvedPage = typeof data?.page === 'number' ? data.page : targetPage

            setReviews((prev) => (mode === 'replace' ? content : [...prev, ...content]))
            setPage(resolvedPage)
            // totalElements가 없으면 지금까지 쌓인 목록 길이로 대체 (헤더에서 reviews.length로 폴백)
            setTotal(typeof data?.totalElements === 'number' ? data.totalElements : 0)
            // last가 없으면 totalPages로 마지막 페이지 여부를 판정한다
            setLast(
                typeof data?.last === 'boolean'
                    ? data.last
                    : typeof data?.totalPages === 'number'
                        ? resolvedPage + 1 >= data.totalPages
                        : true,
            )
            setError(null)
        } catch (e: any) {
            if (seq !== seqRef.current) return
            console.warn('[reviews] 조회 실패:', e?.response?.status ?? e?.message)
            if (mode === 'replace') setReviews([])
            setError(mode === 'replace' ? '리뷰를 불러오지 못했어요.' : '리뷰를 더 불러오지 못했어요.')
        } finally {
            if (seq === seqRef.current) {
                setLoading(false)
                setLoadingMore(false)
            }
        }
    }, [])

    // 행사가 바뀌면 목록을 초기화하고 첫 페이지부터 다시 조회
    useEffect(() => {
        seqRef.current += 1 // 진행 중이던 이전 행사의 요청 무효화
        setReviews([])
        setPage(0)
        setLast(true)
        setTotal(0)
        setLoadingMore(false)
        setError(null)
        void load(0, 'replace')
        return () => {
            seqRef.current += 1
        }
    }, [eventId, load])

    const handleLoadMore = () => {
        if (loading || loadingMore || last) return
        void load(page + 1, 'append')
    }

    const handleRetry = () => {
        // 목록이 있으면 다음 페이지 재시도, 없으면 첫 페이지 재시도
        if (reviews.length === 0) void load(0, 'replace')
        else void load(page + 1, 'append')
    }

    const showEmpty = !loading && !error && reviews.length === 0
    // totalElements가 없으면 지금 렌더된 개수로 표기
    const count = total > 0 ? total : reviews.length
    const showErrorBox = !!error && (
        <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
                style={styles.retryBtn}
                onPress={handleRetry}
                disabled={loading || loadingMore}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="리뷰 조회 다시 시도"
            >
                <Text style={styles.retryText}>다시 시도</Text>
            </TouchableOpacity>
        </View>
    )

    return (
        <View style={styles.section}>
            <View style={styles.titleRow}>
                <Text style={styles.sectionTitle}>리뷰</Text>
                {!loading && !error && count > 0 && <Text style={styles.countText}>{count}개</Text>}
            </View>

            {loading ? (
                <View style={styles.loadingBox} accessibilityLabel="리뷰 불러오는 중">
                    <ActivityIndicator color="#FF6B35" />
                </View>
            ) : (
                <>
                    {reviews.length > 0 && (
                        <View style={styles.list}>
                            {reviews.map((review) => (
                                <ReviewCard key={review.id} review={review} />
                            ))}
                        </View>
                    )}

                    {showEmpty && <Text style={styles.emptyNote}>아직 작성된 리뷰가 없어요.</Text>}
                    {showErrorBox}

                    {/* 에러가 있으면 아래 오류 박스의 '다시 시도'로 통일해 중복 노출을 막는다 */}
                    {reviews.length > 0 && !last && !error && (
                        <TouchableOpacity
                            style={styles.moreBtn}
                            onPress={handleLoadMore}
                            disabled={loadingMore}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel={`리뷰 ${REVIEW_PAGE_SIZE}개 더 보기`}
                        >
                            {loadingMore ? (
                                <ActivityIndicator color="#FF6B35" />
                            ) : (
                                <Text style={styles.moreText}>{REVIEW_PAGE_SIZE}개 더 보기</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </>
            )}
        </View>
    )
}

export default ReviewSection

const styles = StyleSheet.create({
    section: { marginTop: 22 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
    countText: { fontSize: 13, fontWeight: '700', color: '#9ca3af' },
    list: { gap: 10 },
    loadingBox: { paddingVertical: 22, alignItems: 'center' },
    emptyNote: { paddingVertical: 18, textAlign: 'center', fontSize: 13, color: '#9ca3af' },
    errorBox: {
        backgroundColor: '#fef2f2',
        borderRadius: 14,
        padding: 14,
        alignItems: 'center',
        gap: 10,
    },
    errorText: { fontSize: 13, color: '#b91c1c', textAlign: 'center' },
    retryBtn: {
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: '#dc2626',
        paddingHorizontal: 16,
        paddingVertical: 7,
    },
    retryText: { fontSize: 13, fontWeight: '800', color: '#dc2626' },
    moreBtn: {
        marginTop: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
    },
    moreText: { fontSize: 14, fontWeight: '800', color: '#6b7280' },
})