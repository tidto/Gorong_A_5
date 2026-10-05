// ─────────────────────────────────────────────
// components/review/PawRating.tsx
// 1~5점 발바닥 평점 (읽기 전용)
//
// 별점/아이콘 라이브러리를 새로 추가하지 않는다.
// VenueDetailModal이 이미 이모지를 직접 쓰고 있고(InfoRow icon="🐾"), 웹도 paws 컨셉이라
// 🐾 이모지로 표시한다. 채워진 점은 이모지 그대로, 빈 점은 같은 이모지를 흐리게(opacity) 표시.
// ─────────────────────────────────────────────
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

type Props = {
    rating: number
    size?: number
}

const MAX_SCORE = 5

function PawRating({ rating, size = 15 }: Props) {
    // rating은 Integer지만 범위를 벗어나도 레이아웃이 깨지지 않도록 클램프
    const safe = Number.isFinite(rating) ? Math.min(MAX_SCORE, Math.max(0, Math.round(rating))) : 0

    return (
        <View
            style={styles.row}
            accessibilityRole="image"
            accessibilityLabel={`5점 만점에 ${safe}점`}
        >
            {Array.from({ length: MAX_SCORE }, (_, i) => (
                <Text key={i} style={[styles.paw, { fontSize: size, opacity: i < safe ? 1 : 0.25 }]}>
                    🐾
                </Text>
            ))}
        </View>
    )
}

export default PawRating

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 1 },
    paw: { lineHeight: 20 },
})