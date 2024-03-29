import Express from "express"
import authorsRouter from "./api/authors/index.js"
import cors from "cors"
import mongoose from "mongoose"

import {badRequestHandler, unauthorizedHandler, notfoundHandler, genericErrorHandler, forbiddenErrorHandler} from "./errorHandlers.js"
import blogpostsRouter from "./api/blogposts/index.js"
import createHttpError from "http-errors"
import passport from "passport"
import { googleStrategy } from "./lib/tools.js"

const server = Express()
const port = process.env.PORT || 3420
const whitelist = [process.env.FE_DEV_URL, process.env.FE_PROD_URL]

passport.use("google", googleStrategy)

server.use(cors({
    origin: (currentOrigin, corsNext) => {
        if (!currentOrigin || whitelist.indexOf(currentOrigin) !== -1) {
            corsNext(null, true)
        } else {
            corsNext(createHttpError(400, `Origin ${currentOrigin} is not whitelisted.`))
        }
    }
}))

server.use(Express.json())
server.use(passport.initialize())

server.use("/authors", authorsRouter)
server.use("/blogposts", blogpostsRouter)

server.use(badRequestHandler)
server.use(unauthorizedHandler)
server.use(forbiddenErrorHandler)
server.use(notfoundHandler)
server.use(genericErrorHandler)

mongoose.connect(process.env.MONGO_URL)

mongoose.connection.on("connected", () => {
    console.log("Connected to MongoDB")
    server.listen(port, () => {
        console.log(`Server started on Port ${port}.`)
    })

})
