import { io as socketIO, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = () => {
    if (socket) return socket;

    socket = socketIO('http://localhost:3001', {
        transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
        console.log('[WEBSOCKET] Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('[WEBSOCKET] Disconnected from server');
    });

    socket.on('connect_error', (error) => {
        console.error('[WEBSOCKET] Connection error:', error);
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
