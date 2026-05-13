import axios from 'axios';

const API_URL = 'http://98.84.85.31/api/groups';

export const fetchGroups = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};
