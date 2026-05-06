// 가구 아이템 타입 정의
export type FurnitureType = 
  | 'bed' 
  | 'shelf' 
  | 'toy' 
  | 'rug' 
  | 'plant' 
  | 'lamp' 
  | 'window' 
  | 'picture';

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  name: string;
  emoji: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  color?: string;
}

export interface MiniHomeDecoration {
  furnitureItems: FurnitureItem[];
  backgroundColor: string;
  characterColor: string;
  characterPattern?: string;
}
