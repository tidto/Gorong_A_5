import axios from 'axios';

const API_URL = 'http://localhost:8080/api/groups';

export const fetchGroups = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};