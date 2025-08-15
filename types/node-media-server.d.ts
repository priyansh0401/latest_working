declare module 'node-media-server' {
  interface Config {
    rtmp: {
      port: number
      chunk_size: number
      gop_cache: boolean
      ping: number
      ping_timeout: number
    }
    http: {
      port: number
      allow_origin: string
    }
  }

  class NodeMediaServer {
    constructor(config: Config)
    run(): void
  }

  export default NodeMediaServer
} 