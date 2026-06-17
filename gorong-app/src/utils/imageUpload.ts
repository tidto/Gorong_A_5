import * as ImageManipulator from 'expo-image-manipulator'
import type { ImagePickerAsset } from 'expo-image-picker'

// 💡 반환 타입에 type(MIME 타입)을 추가하여 FormData 생성 시 에러를 방지합니다.
type PreparedImage = {
  uri: string
  fileName: string
  type: string // 추가됨: S3 업로드 시 필수 요소
}

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.6

export async function prepareImageForUpload(
  asset: ImagePickerAsset,
  fallbackName: string,
): Promise<PreparedImage> {
  const originalFileName = asset.fileName ?? fallbackName
  const width = asset.width ?? 0
  const height = asset.height ?? 0
  const hasDimensions = width > 0 && height > 0

  const shouldResize = hasDimensions && (width > MAX_DIMENSION || height > MAX_DIMENSION)
  
  // 💡 리사이징 로직 수정: 비율 계산 대신 긴 축을 기준으로 하나만 넘기면 
  // Expo가 알아서 원본 비율에 맞춰 나머지 길이를 조절해 줍니다.
  let resizeAction: ImageManipulator.ActionResize[] = []
  if (shouldResize) {
    if (width > height) {
      resizeAction = [{ resize: { width: MAX_DIMENSION } }] // 가로가 더 길면 가로를 제한
    } else {
      resizeAction = [{ resize: { height: MAX_DIMENSION } }] // 세로가 더 길면 세로를 제한
    }
  }

  // 💡 안전한 파일명 변경: 원본 확장자를 제거하고 무조건 .jpg를 붙입니다.
  const baseName = originalFileName.includes('.') 
    ? originalFileName.substring(0, originalFileName.lastIndexOf('.')) 
    : originalFileName
  const finalFileName = `${baseName}.jpg`

  try {
    const result = await ImageManipulator.manipulateAsync(
      asset.uri,
      resizeAction, // 계산된 단일 축 리사이징 적용
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG, // JPEG 강제 변환
      },
    )

    return {
      uri: result.uri,
      fileName: finalFileName,
      type: 'image/jpeg', // 서버 통신(FormData)을 위해 명시적으로 타입 반환
    }
  } catch (error) {
    console.warn('[ImageUpload] 이미지 최적화 실패, 원본을 사용합니다:', error)
    return {
      uri: asset.uri,
      fileName: finalFileName,
      type: 'image/jpeg', // 실패하여 원본을 쓰더라도 형식은 맞춤
    }
  }
}