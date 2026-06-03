// ─────────────────────────────────────────────────────────────────
// SignupScreen.tsx — 회원가입 화면
//
// 진입 케이스:
//   A) LoginScreen에서 "회원가입" 버튼 → 신규 Firebase 계정 생성 + 백엔드 가입
//   B) Firebase 계정은 있지만 백엔드 미등록 (needsSignup=true) → 자동 진입
//
// 흐름:
//   이메일/비밀번호 입력 → Firebase createUser
//   → POST /api/v1/users/signup → completeSignup() → 메인탭
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
} from 'react-native'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../config/firebaseConfig'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import { User, SignUpPayload } from '../../types'
import { StackNavigationProp } from '@react-navigation/stack'
import { AuthStackParamList } from '../../navigation/AppNavigator'

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Signup'>
}

// 베리어프리 선택 옵션
const BARRIER_OPTIONS: { label: string; value: SignUpPayload['barrierFreeType'] }[] = [
  { label: '해당 없음', value: 'NONE' },
  { label: '지체 장애', value: 'PHYSICAL' },
  { label: '시각 장애', value: 'VISUAL' },
  { label: '청각 장애', value: 'AUDITORY' },
]

export default function SignupScreen({ navigation }: Props) {
  // ─── 입력 상태 ──────────────────────────────
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [barrierFreeType, setBarrierFreeType] =
    useState<SignUpPayload['barrierFreeType']>('NONE')
  const [isForeigner, setIsForeigner] = useState(false)
  const [loading, setLoading] = useState(false)

  const { completeSignup, needsSignup } = useAuthStore()

  // ─── 회원가입 처리 ───────────────────────────
  const handleSignup = async () => {
    // 유효성 검사
    if (!email.trim()) return Alert.alert('입력 오류', '이메일을 입력해 주세요.')
    if (!password.trim() || password.length < 6)
      return Alert.alert('입력 오류', '비밀번호는 6자 이상이어야 합니다.')
    if (password !== passwordConfirm)
      return Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.')
    if (!nickname.trim())
      return Alert.alert('입력 오류', '닉네임을 입력해 주세요.')

    setLoading(true)
    try {
      // ── Step 1: Firebase 계정 생성 (needsSignup 케이스는 이미 계정 존재) ──
      // needsSignup이 true이면 이미 Firebase 계정이 있으므로 건너뜀
      if (!needsSignup) {
        await createUserWithEmailAndPassword(auth, email.trim(), password)
      }

      // ── Step 2: 백엔드 회원가입 (Firebase 토큰 인터셉터가 자동 첨부) ──
      const payload: SignUpPayload = {
        email: email.trim(),
        nickname: nickname.trim(),
        barrierFreeType,
        isForeigner,
      }
      await api.post('/users/signup', payload)

      // ── Step 3: 가입 완료 → authStore 업데이트 → 메인탭 진입 ──
      const currentUser = auth.currentUser
      if (!currentUser) throw new Error('Firebase 유저를 찾을 수 없습니다.')

      const newUser: User = {
        uid: currentUser.uid,
        email: email.trim(),
        nickname: nickname.trim(),
        roleType: 'USER',
        accountStatus: 'ACTIVE',
      }
      await completeSignup(newUser)
      // completeSignup → needsSignup = false, user 세팅
      // App.tsx에서 상태 변화 감지 → 자동으로 MainTab으로 전환됨
    } catch (error: any) {
      const msg = parseSignupError(error)
      Alert.alert('가입 실패', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>🐾 고롱 회원가입</Text>
          <Text style={styles.subtitle}>당신의 발걸음이 문화를 만듭니다</Text>
        </View>

        {/* 이메일 — needsSignup이면 이미 Firebase 계정 존재, 입력 불필요 */}
        {!needsSignup && (
          <>
            <Text style={styles.label}>이메일 *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="gorong@example.com"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />

            <Text style={styles.label}>비밀번호 * (6자 이상)</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              placeholderTextColor="#aaa"
              secureTextEntry
              textContentType="newPassword"
            />

            <Text style={styles.label}>비밀번호 확인 *</Text>
            <TextInput
              style={styles.input}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호 재입력"
              placeholderTextColor="#aaa"
              secureTextEntry
              textContentType="newPassword"
            />
          </>
        )}

        {/* needsSignup 케이스 안내 */}
        {needsSignup && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Firebase 계정은 확인됐습니다.{'\n'}
              고롱 프로필 정보를 입력해 주세요.
            </Text>
          </View>
        )}

        {/* 닉네임 */}
        <Text style={styles.label}>닉네임 *</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          placeholder="고롱에서 사용할 닉네임"
          placeholderTextColor="#aaa"
          maxLength={20}
          autoCorrect={false}
        />

        {/* 베리어프리 선택 */}
        <Text style={styles.label}>무장애(베리어프리) 정보</Text>
        <Text style={styles.labelSub}>해당하는 항목을 선택하면 맞춤 행사 정보를 제공합니다</Text>
        <View style={styles.barrierRow}>
          {BARRIER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.barrierBtn,
                barrierFreeType === opt.value && styles.barrierBtnActive,
              ]}
              onPress={() => setBarrierFreeType(opt.value)}
            >
              <Text
                style={[
                  styles.barrierBtnText,
                  barrierFreeType === opt.value && styles.barrierBtnTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 외국인 여부 */}
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>외국인 거주자</Text>
            <Text style={styles.switchSub}>다국어 행사 정보를 우선 안내합니다</Text>
          </View>
          <Switch
            value={isForeigner}
            onValueChange={setIsForeigner}
            trackColor={{ true: '#FF6B35', false: '#e0e0e0' }}
            thumbColor="#fff"
          />
        </View>

        {/* 가입 버튼 */}
        <TouchableOpacity
          style={[styles.signupBtn, loading && styles.btnDisabled]}
          onPress={handleSignup}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signupBtnText}>가입 완료</Text>
          )}
        </TouchableOpacity>

        {/* 로그인으로 돌아가기 */}
        {!needsSignup && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>← 로그인으로 돌아가기</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// ─── 에러 메시지 파싱 ─────────────────────────
function parseSignupError(error: any): string {
  const code = error?.code
  if (code === 'auth/email-already-in-use')
    return '이미 사용 중인 이메일입니다. 로그인 화면에서 로그인해 주세요.'
  if (code === 'auth/invalid-email')
    return '올바른 이메일 형식이 아닙니다.'
  if (code === 'auth/weak-password')
    return '비밀번호가 너무 짧습니다. 6자 이상 입력해 주세요.'
  if (code === 'auth/network-request-failed')
    return '네트워크 연결을 확인해 주세요.'
  // 백엔드 에러 (axios)
  const backendMsg = error?.response?.data
  if (typeof backendMsg === 'string') return backendMsg
  return '가입에 실패했습니다. 다시 시도해 주세요.'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inner: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // ─── 헤더 ───
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
  },

  // ─── 폼 ───
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
    marginTop: 20,
  },
  labelSub: {
    fontSize: 11,
    color: '#aaa',
    marginBottom: 10,
    marginTop: -4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#222',
    backgroundColor: '#fafafa',
  },

  // ─── 안내 박스 (needsSignup) ───
  infoBox: {
    backgroundColor: '#FFF3EE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B35',
  },
  infoText: {
    fontSize: 13,
    color: '#FF6B35',
    lineHeight: 20,
  },

  // ─── 베리어프리 버튼 ───
  barrierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  barrierBtn: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fafafa',
  },
  barrierBtnActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF3EE',
  },
  barrierBtnText: {
    fontSize: 13,
    color: '#666',
  },
  barrierBtnTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },

  // ─── 외국인 토글 ───
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  switchSub: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 2,
  },

  // ─── 버튼 ───
  signupBtn: {
    marginTop: 32,
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  signupBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  backBtnText: {
    fontSize: 13,
    color: '#999',
  },
})
