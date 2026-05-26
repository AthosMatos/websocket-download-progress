export const CHUNK_SIZE = 64 * 1024 // 64 KB per chunk

export interface ProgressState {
    progress: number
    message: string
    status: 'idle' | 'loading' | 'done' | 'error'
}

export const initialState: ProgressState = {
    progress: 0,
    message: '',
    status: 'idle',
}