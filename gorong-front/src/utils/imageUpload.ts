const MAX_DIMENSION = 1600
const MAX_FILE_SIZE = 5 * 1024 * 1024

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('이미지를 읽지 못했습니다.'))
    }
    image.src = objectUrl
  })

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('이미지 변환에 실패했습니다.'))
        return
      }
      resolve(blob)
    }, 'image/webp', quality)
  })

export async function optimizeImageFile(file: File) {
  if (file.size <= MAX_FILE_SIZE && file.type === 'image/webp') {
    return file
  }

  const image = await loadImage(file)
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('이미지 캔버스를 초기화하지 못했습니다.')
  }

  context.drawImage(image, 0, 0, width, height)

  let quality = 0.86
  let blob = await canvasToBlob(canvas, quality)
  while (blob.size > MAX_FILE_SIZE && quality > 0.55) {
    quality -= 0.08
    blob = await canvasToBlob(canvas, quality)
  }

  return new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' })
}
