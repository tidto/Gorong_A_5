import axiosInstance from './axiosInstance'

export type UploadSourceType = 'APP_PHOTO' | 'TRAIL_ART' | 'POST_PHOTO'

export async function uploadFileToS3(
  file: File,
  sourceType: UploadSourceType = 'POST_PHOTO',
  autoSaveToGallery = true,
  referenceId?: number,
) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await axiosInstance.post('/v1/files/upload', formData, {
    params: { sourceType, autoSaveToGallery, referenceId },
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}
