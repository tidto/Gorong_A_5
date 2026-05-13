import { useEffect, useState } from 'react';
import { fetchGroups } from '../api/groupApi';

const GroupListPage = () => {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    fetchGroups().then(data => setGroups(data));
  }, []);

  return (
      <div style={{ padding: '20px' }}>
        <h2>👥 행사 모집 게시판</h2>
        <div className="grid">
          {groups.map((group: any) => (
              <div key={group.id} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
                <h3>{group.title}</h3>
                <p>📍 장소: {group.location}</p>
                <p>👥 인원: {group.maxParticipants}명</p>
              </div>
          ))}
        </div>
      </div>
  );
};

export default GroupListPage;