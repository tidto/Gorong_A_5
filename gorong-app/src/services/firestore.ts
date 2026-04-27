import firestore from '@react-native-firebase/firestore';

// 지오펜스 익명 채팅방 (venueId 기준)
export function getAnonymousChatRef(venueId: string) {
  return firestore().collection('anonymous_chats').doc(venueId).collection('messages');
}

// 모임 채팅방 (웹에서 생성된 모임 ID 기준)
export function getGroupChatRef(groupId: string) {
  return firestore().collection('group_chats').doc(groupId).collection('messages');
}

export async function sendMessage(chatRef: any, userId: string, text: string, isAnonymous = true) {
  await chatRef.add({
    text,
    senderId: isAnonymous ? 'anonymous_' + userId.slice(0, 6) : userId,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
}

// 위치 공유 (버튼 눌렀을 때만, 30초 유지)
export async function shareLocation(groupId: string, userId: string, lat: number, lng: number) {
  const expiresAt = new Date(Date.now() + 30000); // 30초 후 만료
  await firestore().collection('group_locations').doc(groupId)
    .collection('members').doc(userId)
    .set({ lat, lng, expiresAt, updatedAt: firestore.FieldValue.serverTimestamp() });
}