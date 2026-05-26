import { useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

export const useWebSocket = () => {
    const [isConnected, setIsConnected] = useState(false)
    const [emitedEventHistory, setEmitedEventHistory] = useState<
        { eventName: string; data: any; response: any }[]
    >([])
    const [listenedEventHistory, setListenedEventHistory] = useState<
        { eventName: string; data: any }[]
    >([])
    const socketRef = useRef<Socket | null>(null)

    const emitEvent = <T,>(eventName: string, data?: T) => {
        if (!socketRef.current) {
            console.warn('Socket not connected. Call connectTo() first.')
            return
        }
        socketRef.current.emit(eventName, data, (response: any) => {
            setEmitedEventHistory((prev) => [...prev, { eventName, data, response }])
        })
    }

    const connectTo = (API_URL: string) => {
        // Tear down any existing connection first
        if (socketRef.current) {
            socketRef.current.removeAllListeners()
            socketRef.current.disconnect()
            socketRef.current = null
        }

        try {
            const socket = io(API_URL)
            socketRef.current = socket

            socket.on('connect', () => {
                setIsConnected(true)
            })

            socket.on('disconnect', () => {
                setIsConnected(false)
            })
        } catch (error) {
            console.error('Failed to connect to WebSocket server:', error)
        }
    }

    const subscribeToEvent = <T,>(eventName: string, callback: (data: T) => void) => {
        if (!socketRef.current) {
            console.warn('Socket not connected. Call connectTo() first.')
            return
        }
        socketRef.current.on(eventName, (data: T) => {
            callback(data)
            setListenedEventHistory((prev) => [...prev, { eventName, data }])
        })
    }

    const cleanListeners = (eventName: string) => {
        if (!socketRef.current) {
            console.warn('Socket not connected. Call connectTo() first.')
            return
        }
        socketRef.current.removeAllListeners(eventName)
    }

    const disconnect = () => {
        if (socketRef.current) {
            socketRef.current.removeAllListeners()
            socketRef.current.disconnect()
            socketRef.current = null
            setIsConnected(false)
        }
    }

    return {
        connectTo,
        emitEvent,
        subscribeToEvent,
        disconnect, cleanListeners,
        isConnected,
        emitedEventHistory,
        listenedEventHistory,
    }
}
