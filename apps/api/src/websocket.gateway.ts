import { apiEvents } from '@constants/api/apiEvents';
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface UploadStartPayload {
    fileName: string;
    fileSize: number;
    totalChunks: number;
}

interface UploadChunkPayload {
    index: number;
    totalChunks: number;
    data: ArrayBuffer;
}


@WebSocketGateway({ cors: { origin: '*' } })
export class Gateway {
    @WebSocketServer()
    server: Server | undefined;

    private uploads = new Map<
        string,
        { fileName: string; fileSize: number; received: number; chunks: Buffer[] }
    >();

    @SubscribeMessage(apiEvents.download.start)
    handleStartDownload(@ConnectedSocket() client: Socket,) {

        const filePath = join(process.cwd(), 'assets', 'M90 (NGC 4569).jpg');
        const fileBuffer = readFileSync(filePath, 'binary');

        const fileSize = fileBuffer.length;
        const chunkSize = 1024 * 64; // 64KB
        const totalChunks = Math.ceil(fileSize / chunkSize);

        client.emit(apiEvents.download.info, {
            fileName: 'M90.jpg',
            fileSize,
            totalChunks,
        });

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, fileSize);
            const chunk = fileBuffer.slice(start, end);
            console.log(`Emitting chunk ${i + 1} of ${totalChunks} (${((end / fileSize) * 100).toFixed(1)}%)`);
            client.emit(apiEvents.download.chunk, {
                index: i,
                totalChunks,
                data: chunk,
            });
            client.emit(apiEvents.download.progress, {
                progress: Math.round(((i + 1) / totalChunks) * 100),
                message: `Sent chunk ${i + 1} of ${totalChunks}`,
            });
        }

    }

    @SubscribeMessage(apiEvents.upload.start)
    handleStartUpload(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: UploadStartPayload,
    ) {
        this.uploads.set(client.id, {
            fileName: payload.fileName,
            fileSize: payload.fileSize,
            received: 0,
            chunks: [],
        });

        client.emit(apiEvents.upload.progress, {
            progress: 0,
            message: `Starting upload of "${payload.fileName}" (${(payload.fileSize / 1024).toFixed(1)} KB)...`,
        });
    }

    @SubscribeMessage(apiEvents.upload.chunk)
    handleUploadChunk(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: UploadChunkPayload,
    ) {
        const upload = this.uploads.get(client.id);
        if (!upload) {
            client.emit(apiEvents.upload.error, { message: 'No upload in progress.' });
            return;
        }

        const buf = Buffer.from(payload.data);
        upload.chunks.push(buf);
        upload.received += buf.length;

        const progress = Math.min(
            Math.round((upload.received / upload.fileSize) * 100),
            100,
        );

        client.emit(apiEvents.upload.progress, {
            progress,
            chunk: payload.index + 1,
            totalChunks: payload.totalChunks,
            received: upload.received,
            fileSize: upload.fileSize,
            message:
                progress < 100
                    ? `Uploading chunk ${payload.index + 1} of ${payload.totalChunks}...`
                    : `Upload of "${upload.fileName}" complete!`,
        });

        if (progress >= 100) {
            // All chunks received — the full file is in upload.chunks
            // You could write to disk / process here:
            // const fullFile = Buffer.concat(upload.chunks);
            this.uploads.delete(client.id);
        }
    }

    handleDisconnect(client: Socket) {
        this.uploads.delete(client.id);
    }
}
