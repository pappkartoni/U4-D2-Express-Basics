import Express from "express"
import authorsRouter from "./api/authors/index.js"
import cors from "cors"
import { join } from "path"
import {badRequestHandler, unauthorizedHandler, notfoundHandler, genericErrorHandler} from "./errorHandlers.js"
import blogpostsRouter from "./api/blogposts/index.js"

const publicPath = join(process.cwd(), "./public")

const server = Express()
server.use(Express.static(publicPath))
server.use(cors())
server.use(Express.json())

server.use("/authors", authorsRouter)
server.use("/blogposts", blogpostsRouter)

server.use(badRequestHandler)
server.use(unauthorizedHandler)
server.use(notfoundHandler)
server.use(genericErrorHandler)

server.listen(3420, () => {
    console.log("Server started.")
})