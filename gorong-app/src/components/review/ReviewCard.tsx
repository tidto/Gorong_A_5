// ─────────────────────────────────────────────
// components/review/ReviewCard.tsx
// 리뷰 1건 표시 (읽기 전용)
//
// 표시: 작성자(authorName) / 발바닥 평점(rating) / 본문(reviewText) / 작성일(createdAt) / 이미지
//
// 쓰지 않는 필드:
//   contents   — 이 조회 API는 항상 null (ReviewController가 toSummary(review, false))
//   postingPath— 웹 전용 경로
//   eventTitle — 폴백 문자열("행사 정보 없음" 등)이 섞일 수 있어 모달의 venue.name과 중복
//   userId     — '내 리뷰' 판별은 이번 범위 밖
//   status     — REVIEW_ONLY / PUBLISHED 둘 다 표시하고 배지는 붙이지 않는다
// ─────────────────────────────────────────────
import React from 'react'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { ReviewImageSummary, ReviewSummary } from '../../types/review'
import PawRating from './PawRating'

type Props = {
    review: ReviewSummary
}

// ISO-8601 → '2026.10.01 12:34' (TrailScreen.formatTime과 동일한 포맷)
function formatCreatedAt(iso: string | null | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function ReviewImageRow({ images }: { images: ReviewImageSummary[] }) {
    if (images.length === 0) return null
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageRow}
            style={styles.imageScroll}
        >
            {images.map((img) => (
                <Image
                    key={img.id}
                    source={{ uri: img.imageUrl }}
                    style={styles.thumb}
                    resizeMode="cover"
                    accessibilityLabel="리뷰 첨부 이미지"
                />
            ))}
        </ScrollView>
    )
}

function ReviewCard({ review }: Props) {
    const images = Array.isArray(review.images) ? review.images : []
    const authorName = review.authorName?.trim() || '알 수 없음'
    // reviewText는 DB상 nullable이라 빈 값일 수 있다
    const body = review.reviewText?.trim()
    const createdAt = formatCreatedAt(review.createdAt)

    return (
        <View style={styles.card}>
            <View style={styles.headRow}>
                <Text style={styles.author} numberOfLines={1}>
                    {authorName}
                </Text>
                {!!createdAt && <Text style={styles.date}>{createdAt}</Text>}
            </View>

            <View style={styles.pawRow}>
                <PawRating rating={review.rating} />
            </View>

            <Text style={[styles.text, !body && styles.textMuted]} numberOfLines={6}>
                {body || '내용을 입력하지 않은 리뷰예요.'}
            </Text>

            <ReviewImageRow images={images} />
        </View>
    )
}

export default ReviewCard

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#f9fafb',
        borderRadius: 14,
        padding: 14,
        gap: 8,
    },
    headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    author: { flex: 1, fontSize: 14, fontWeight: '800', color: '#111827' },
    date: { fontSize: 12, color: '#9ca3af' },
    pawRow: { flexDirection: 'row', alignItems: 'center' },
    text: { fontSize: 14, color: '#374151', lineHeight: 21 },
    textMuted: { color: '#9ca3af', fontSize: 13 },
    imageScroll: { marginTop: 2 },
    imageRow: { gap: 8, paddingRight: 4 },
    thumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#e5e7eb' },
})