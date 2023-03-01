import Express from "express";
import fs from "fs"
import {fileURLToPath} from "url"
import {dirname, join} from "path"
import {v4 as uuidv4} from "uuid"
import createHttpError from "http-errors"
import { checkBlogpostSchema, triggerBadRequest } from "../validate.js"

const blogpostsRouter = Express.Router()
const blogsPath = join(dirname(fileURLToPath(import.meta.url)), "blogposts.json")

const getBlogposts = () => JSON.parse(fs.readFileSync(blogsPath))
const setBlogposts = blogposts => fs.writeFileSync(blogsPath, JSON.stringify(blogposts))

blogpostsRouter.post("/", checkBlogpostSchema, triggerBadRequest, (req, res, next) => {
    try {
        const newBlogpost = {...req.body, uuid: uuidv4(), createdAt: new Date(), updatedAt: new Date()}
        const blogposts = getBlogposts()
        blogposts.push(newBlogpost)
        setBlogposts(blogposts)

        res.status(201).send({uuid: newBlogpost.uuid})
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.get("/", (req, res, next) => {
    try {
        const blogposts = getBlogposts()
        if (req.query && req.query.title) {
            const filtered = blogposts.filter(b => b.title.toLowerCase().includes(req.query.title.toLowerCase()))
            res.send(filtered)
        } else {
            res.send(blogposts)
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.get("/:uuid", (req, res, next) => {
    try {
        const blogposts = getBlogposts()
        const foundBlogpost = blogposts.find(b => b.uuid === req.params.uuid)
        if (foundBlogpost) {
            res.send(foundBlogpost)
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.put("/:uuid", checkBlogpostSchema, triggerBadRequest, (req, res, next) => {
    try {
        const blogposts = getBlogposts()
        const i = blogposts.findIndex(b => b.uuid === req.params.uuid)
        if (i !== -1) {
            const updated = {...blogposts[i], ...req.body, updatedAt: new Date()}
            blogposts[i] = updated
            setBlogposts(blogposts)
            res.send(updated)
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.delete("/:uuid", (req, res, next) => {
    try {
        const blogposts = getBlogposts()
        const remaining = blogposts.filter(b => b.uuid !== req.params.uuid)
        if (blogposts.length !== remaining.length) {
            setBlogposts(remaining)
            res.status(204).send()
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

export default blogpostsRouter
