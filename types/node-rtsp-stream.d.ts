declare module "node-rtsp-stream" {
  export class Stream {
    constructor(options: {
      name: string
      streamUrl: string
      wsPort: number
      ffmpegOptions?: Record<string, string | number>
    })
    stop(): void
  }
} 