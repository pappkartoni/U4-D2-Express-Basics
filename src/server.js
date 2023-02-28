import Express from "express"
import authorsRouter from "./api/authors/index.js"

const server = Express()

server.use(Express.json())
server.use("/authors", authorsRouter)

server.listen(3420, () => {
    console.log("Server started.")
})