
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001',
});

export const getProjects = () => api.get('/projects');
export const createProject = (name: string) => api.post('/projects', { name });
export const addRepo = (projectId: string, name: string, url: string, type: string) =>
    api.post('/repos', { projectId, name, url, type });
export const getGraph = (projectId?: string) => {
    const params = projectId ? { projectId } : {};
    return api.get('/graph', { params });
};
