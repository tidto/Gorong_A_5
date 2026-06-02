import axiosInstance from './axiosInstance'

export interface TourItemDto {
    title: string
    addr1: string
    mapx: string       // 경도
    mapy: string       // 위도
    firstimage?: string
    contentid: string
    overview?: string
    parking?: string
    elevator?: string
    restroom?: string
    route?: string
    areacode?: string
    cat1?: string
}

export const getEventList = (): Promise<TourItemDto[]> =>
    axiosInstance.get<TourItemDto[]>('/public/map').then(res => res.data)

export const getEventDetail = (id: string): Promise<TourItemDto> =>
    axiosInstance.get<TourItemDto>(`/public/map/${id}`).then(res => res.data)