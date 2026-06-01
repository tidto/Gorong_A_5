// ─────────────────────────────────────────────────────────────────
// ReportScreen.tsx — 현장 신고 화면 (후순위 기능)
//
// 기능 목표:
//   사진 2장(다른 각도) 촬영 → 이미지 AI 검증 → 지도 마커 생성
//   타 유저에게도 마커 공유 + 좋아요/아니에요 반응
//
// 현재 상태: UI 스캐폴딩 완료, AI 검증 서버 연동 예정
// ─────────────────────────────────────────────────────────────────

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

export default function ReportScreen() {
  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚧 현장 신고</Text>
        <Text style={styles.headerSub}>
          지도에 없는 공사현장이나 장애물을 신고하세요
        </Text>
      </View>

      {/* 안내 카드 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>신고 방법</Text>
        <Text style={styles.cardStep}>1️⃣ 현장 사진 1장 촬영</Text>
        <Text style={styles.cardStep}>2️⃣ 다른 각도로 2번째 사진 촬영</Text>
        <Text style={styles.cardStep}>3️⃣ AI 검증 통과 시 지도에 마커 등록</Text>
        <Text style={styles.cardStep}>4️⃣ 타 유저 도움 여부 평가 수집</Text>
      </View>

      {/* TODO: 추후 구현 */}
      <TouchableOpacity style={styles.cameraBtn} disabled>
        <Text style={styles.cameraBtnText}>📷 사진 촬영 (준비 중)</Text>
      </TouchableOpacity>

      <Text style={styles.notice}>
        AI 검증 서버 연동 후 활성화됩니다.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#FF6B35',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSub: {
    color: '#fff',
    fontSize: 13,
    marginTop: 6,
    opacity: 0.85,
  },
  card: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 14,
  },
  cardStep: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 22,
  },
  cameraBtn: {
    marginHorizontal: 16,
    backgroundColor: '#ccc',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cameraBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  notice: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 12,
    marginTop: 12,
  },
})