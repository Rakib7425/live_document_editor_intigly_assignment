import axios from 'axios'

const API = axios.create({ baseURL: 'http://localhost:4000/api' })

export const AuthAPI = {
	login: (username: string) => API.post('/auth/login', { username }).then(r => r.data as { id: number; username: string }),
	active: () => API.get('/presence/active').then(r => r.data as { users: string[] }),
}

export const DocsAPI = {
	list: (q?: string) => API.get('/documents', { params: { q } }).then(r => r.data as Array<any>),
	create: (title: string) => API.post('/documents', { title }).then(r => r.data as { id: number; title: string }),
	get: (id: number, limit = 50) => API.get(`/documents/${id}`, { params: { limit } }).then(r => r.data as { doc: any; messages: any[] }),
}
