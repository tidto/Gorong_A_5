import axios from 'axios'
import { Venue } from '../types'

const TOUR_API_KEY = process.env.EXPO_PUBLIC_TOUR_API_KEY
const BASE_URL = 'https://apis.data.go.kr/B551011/KorService1'

// 위치 기반 행사 정보 조회
export const fetchNearbyVenues = async (
  lat: number,
  lng: number,
  radius = 5000  // 5km
): Promise<Venue[]> => {
  try {
    const { data } = await axios.get(`${BASE_URL}/locationBasedList1`, {
      params: {
        serviceKey: TOUR_API_KEY,
        numOfRows: 20,
        pageNo: 1,
        MobileOS: 'ETC',
        MobileApp: 'Gorong',
        _type: 'json',
        listYN: 'Y',
        arrange: 'A',
        mapX: lng,
        mapY: lat,
        radius,
        contentTypeId: 15,  // 축제/행사
      }
    })

    const items = data?.response?.body?.items?.item ?? []
    return items.map((item: any): Venue => ({
      id: String(item.contentid),
      name: item.title,
      lat: parseFloat(item.mapy),
      lng: parseFloat(item.mapx),
      radius: 150,  // 지오펜스 기본 반경 150m
      address: item.addr1,
      category: item.cat1,
      imageUrl: item.firstimage,
    }))
  } catch (err) {
    console.error('TourAPI 오류:', err)
    return []
  }
}

// 베리어프리 정보 조회
export const fetchBarrierFreeInfo = async (contentId: string) => {
  const { data } = await axios.get(`${BASE_URL}/detailWithTour1`, {
    params: {
      serviceKey: TOUR_API_KEY,
      MobileOS: 'ETC',
      MobileApp: 'Gorong',
      _type: 'json',
      contentId,
    }
  })
  return data?.response?.body?.items?.item?.[0] ?? null
}