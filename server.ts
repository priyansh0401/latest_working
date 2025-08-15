import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { startRtmpServer } from "./lib/rtmp-server"

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  // Start RTMP server
  startRtmpServer()

  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  }).listen(3000)

  console.log("> Ready on http://localhost:3000")
}) 