import { apiEvents } from '@constants/api/apiEvents'
import { useEffect, useRef, useState } from 'react'
import { CHUNK_SIZE, initialState, type ProgressState } from './consts'
import { useWebSocket } from './hooks/useWebSocket'


type ProgressData = {
  progress: number
  message: string
}
type ChunkData = {
  index: number
  totalChunks: number
  data: string
}
type DownloadDataInfo = {
  fileName: string,
  fileSize: number,
  totalChunks: number,
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-5.5 w-full overflow-hidden rounded-full border border-(--border) bg-(--bg)">
      <div
        className="h-full rounded-full bg-(--accent)"/*  transition-[width] duration-100 */
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

const API_URL = 'http://localhost:3000'



function binaryToImageSrc(binaryData: string) {
  if (!binaryData) return ''

  try {
    // If the incoming data already looks like base64, use it directly
    if (/^[A-Za-z0-9+/=]+$/.test(binaryData) && binaryData.length % 4 === 0) {
      return `data:image/jpeg;base64,${binaryData}`
    }

    // Convert a binary (Latin1) string to base64
    const base64 = btoa(
      Array.from(binaryData, (ch) => String.fromCharCode(ch.charCodeAt(0) & 0xff)).join(''),
    )

    return `data:image/jpeg;base64,${base64}`
  } catch (err) {
    try {
      // Fallback for Unicode-containing strings
      return `data:image/jpeg;base64,${btoa(unescape(encodeURIComponent(binaryData)))}`
    } catch (e) {
      return ''
    }
  }
}

function App() {
  const [imageDownloaded, setImageDownloaded] = useState<{ image?: string, name: string, size: number, done: boolean }>()
  const [downloadState, setDownloadState] = useState<ProgressState>(initialState)
  const [uploadState, setUploadState] = useState<ProgressState>(initialState)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    connectTo,
    disconnect,
    emitEvent,
    isConnected,
    cleanListeners,
    subscribeToEvent,
  } = useWebSocket()


  const startHeavyQuery = () => {
    cleanListeners(apiEvents.download.info)
    cleanListeners(apiEvents.download.progress)
    cleanListeners(apiEvents.download.chunk)

    setDownloadState({ progress: 0, message: 'Connecting...', status: 'loading' })
    setImageDownloaded(undefined)
    emitEvent(apiEvents.download.start)

    console.log('Download started');


    subscribeToEvent<DownloadDataInfo>(apiEvents.download.info, (data) => {
      // console.log('Download info received:', data);
      setImageDownloaded({
        name: data.fileName,
        size: data.fileSize,
        done: false,
      })

    })

    subscribeToEvent<ProgressData>(apiEvents.download.progress, (data) => {
      // console.log('Download progress:', data);
      setDownloadState({
        progress: data.progress,
        message: data.message,
        status: data.progress >= 100 ? 'done' : 'loading',
      })
      if (data.progress >= 100) {
        setImageDownloaded((prev) => prev ? { ...prev, done: true } : prev)

      }
    })

    subscribeToEvent<ChunkData>(apiEvents.download.chunk, (data) => {
      // console.log('Download chunk:', data);
      setImageDownloaded((prev) => {
        if (!prev) return prev
        const newData = prev.image ? prev.image + data.data : data.data
        return {
          ...prev,
          image: newData,
        }
      })
    })


  }

  const startHeavyUpload = () => {
    cleanListeners(apiEvents.upload.start)
    cleanListeners(apiEvents.upload.progress)
    cleanListeners(apiEvents.upload.chunk)
    cleanListeners(apiEvents.upload.progress)
    cleanListeners(apiEvents.upload.error)


    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setUploadState({
        progress: 0,
        message: 'Please select a file first.',
        status: 'error',
      })
      return
    }

    setUploadState({ progress: 0, message: 'Connecting...', status: 'loading' })



    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

    emitEvent(apiEvents.upload.start, {
      fileName: file.name,
      fileSize: file.size,
      totalChunks,
    })

    // Slice and send chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const blob = file.slice(start, end)

      blob.arrayBuffer().then((buffer) => {
        emitEvent(apiEvents.upload.chunk, {
          index: i,
          totalChunks,
          data: buffer,
        })
      })
    }


    subscribeToEvent<ProgressData>(apiEvents.upload.progress, (data) => {
      setUploadState({
        progress: data.progress,
        message: data.message,
        status: data.progress >= 100 ? 'done' : 'loading',
      })
      if (data.progress >= 100) {
        disconnect()
      }
    })

    subscribeToEvent<ProgressData>(apiEvents.upload.error, (data) => {
      setUploadState({
        progress: 0,
        message: data.message || 'Upload failed',
        status: 'error',
      })
      disconnect()
    })

    subscribeToEvent<ProgressData>('connect_error', () => {
      setUploadState({
        progress: 0,
        message: 'Could not connect to server',
        status: 'error',
      })
    })


  }

  useEffect(() => {
    imageDownloaded?.done && console.log(imageDownloaded)
  }, [imageDownloaded])

  return (
    <div className="mx-auto flex max-w-160 flex-col gap-8 px-6 py-12">
      <h1 className="m-0 text-center">Download Progress Demo</h1>

      <section className='flex flex-col items-start gap-4 rounded-xl border border-(--border) bg-(--code-bg) px-6 py-7'>
        <p>Websocket {isConnected ? 'connected' : 'disconnected'}</p>
        <button
          className='cursor-pointer rounded-lg border-2 border-transparent bg-(--accent) px-5 py-2.5 text-[15px] font-medium text-white transition-[opacity,border-color] duration-200 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) disabled:cursor-not-allowed disabled:opacity-50'
          onClick={() => {
            if (isConnected) {
              disconnect()
            } else {
              connectTo(API_URL)
            }
          }}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </section>

      {/* ─── Heavy DB Query (GET + SSE) ─── */}
      <section className="flex flex-col gap-4 rounded-xl border border-(--border) bg-(--code-bg) px-6 py-7">
        <h2>Heavy DB Query</h2>
        <p className="text-[15px] leading-relaxed text-(--text)">
          Simulates a long-running database consultation. Progress is streamed via Server-Sent
          Events.
        </p>

        {imageDownloaded?.done && (
          <div className="flex relative rounded-2xl gap-2 w-full h-40 overflow-hidden">
            <span className="absolute top-2 left-2 text-sm text-white">{`Downloaded "${imageDownloaded.name}" (${(imageDownloaded.size / 1024).toFixed(1)} KB)`}</span>
            <img
              src={binaryToImageSrc(imageDownloaded.image!)}
              alt={imageDownloaded.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <ProgressBar progress={downloadState.progress} />

        <div className="flex min-h-6 items-center gap-3">
          <span className="min-w-13 [font-family:var(--mono)] text-xl font-semibold text-(--text-h)">
            {downloadState.progress}%
          </span>
          <span className="text-sm text-(--text)">{downloadState.message}</span>
        </div>

        <button
          className="cursor-pointer self-start rounded-lg border-2 border-transparent bg-(--accent) px-5 py-2.5 text-[15px] font-medium text-white transition-[opacity,border-color] duration-200 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) disabled:cursor-not-allowed disabled:opacity-50"
          onClick={startHeavyQuery}
          disabled={downloadState.status === 'loading'}
        >
          {downloadState.status === 'loading' ? 'Querying...' : 'Start Query'}
        </button>
      </section>

      {/* ─── Heavy File Upload (POST + SSE) ─── */}
      <section className="flex flex-col gap-4 rounded-xl border border-(--border) bg-(--code-bg) px-6 py-7">
        <h2>Heavy File Upload</h2>
        <p className="text-[15px] leading-relaxed text-(--text)">
          Upload a file and watch the server &quot;process&quot; it chunk by chunk, with real-time
          progress streamed back.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          className="text-sm text-(--text) file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-(--border) file:bg-(--bg) file:px-3.5 file:py-1.5 file:text-sm file:text-(--text-h) file:transition-colors file:duration-200 hover:file:bg-(--accent-bg)"
          disabled={uploadState.status === 'loading'}
        />

        <ProgressBar progress={uploadState.progress} />

        <div className="flex min-h-6 items-center gap-3">
          <span className="min-w-13 [font-family:var(--mono)] text-xl font-semibold text-(--text-h)">
            {uploadState.progress}%
          </span>
          <span className="text-sm text-(--text)">{uploadState.message}</span>
        </div>

        <button
          className="cursor-pointer self-start rounded-lg border-2 border-transparent bg-(--accent) px-5 py-2.5 text-[15px] font-medium text-white transition-[opacity,border-color] duration-200 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) disabled:cursor-not-allowed disabled:opacity-50"
          onClick={startHeavyUpload}
          disabled={uploadState.status === 'loading'}
        >
          {uploadState.status === 'loading' ? 'Processing...' : 'Upload & Process'}
        </button>
      </section>
    </div>
  )
}

export default App
