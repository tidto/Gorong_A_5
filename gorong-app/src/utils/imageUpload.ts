import * as ImageManipulator from 'expo-image-manipulator'
import type { ImagePickerAsset } from 'expo-image-picker'

type PreparedImage = {
  uri: string
  fileName: string
}

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.6

export async function prepareImageForUpload(
  asset: ImagePickerAsset,
  fallbackName: string,
): Promise<PreparedImage> {
  const fileName = asset.fileName ?? fallbackName
  const width = asset.width ?? 0
  const height = asset.height ?? 0
  const hasDimensions = width > 0 && height > 0

  const shouldResize = hasDimensions && (width > MAX_DIMENSION || height > MAX_DIMENSION)
  const scale = shouldResize ? Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height) : 1
  const targetWidth = shouldResize ? Math.max(1, Math.round(width * scale)) : undefined
  const targetHeight = shouldResize ? Math.max(1, Math.round(height * scale)) : undefined

  try {
    const result = await ImageManipulator.manipulateAsync(
      asset.uri,
      shouldResize
        ? [{ resize: { width: targetWidth, height: targetHeight } }]
        : [],
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    )

    return {
      uri: result.uri,
      fileName: fileName.replace(/\.[^.]+$/, '.jpg'),
    }
  } catch (error) {
    console.warn('[ImageUpload] 이미지 최적화 실패, 원본을 사용합니다:', error)
    return {
      uri: asset.uri,
      fileName: fileName.replace(/\.[^.]+$/, '.jpg'),
    }
  }
}
