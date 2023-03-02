import Express from "express";
import fs from "fs"
import {fileURLToPath} from "url"
import {dirname, join} from "path"
import {v4 as uuidv4} from "uuid"
import createHttpError from "http-errors"
import { checkBlogpostSchema, checkCommentSchema, triggerBadRequest } from "../validate.js"
import { getBlogposts, setBlogposts, saveBlogpostImage} from "../../lib/tools.js";
import multer from "multer";

const blogpostsRouter = Express.Router()

blogpostsRouter.post("/", checkBlogpostSchema, triggerBadRequest, async (req, res, next) => {
    try {
        const newBlogpost = {...req.body, uuid: uuidv4(), createdAt: new Date(), updatedAt: new Date()}
        const blogposts = await getBlogposts()
        blogposts.push(newBlogpost)
        await setBlogposts(blogposts)

        res.status(201).send({uuid: newBlogpost.uuid})
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.get("/", async (req, res, next) => {
    try {
        const blogposts = await getBlogposts()
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

blogpostsRouter.get("/:uuid", async (req, res, next) => {
    try {
        const blogposts = await getBlogposts()
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

blogpostsRouter.put("/:uuid", checkBlogpostSchema, triggerBadRequest, async (req, res, next) => {
    try {
        const blogposts = await getBlogposts()
        const i = blogposts.findIndex(b => b.uuid === req.params.uuid)
        if (i !== -1) {
            const updated = {...blogposts[i], ...req.body, updatedAt: new Date()}
            blogposts[i] = updated
            await setBlogposts(blogposts)
            res.send(updated)
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.delete("/:uuid", async (req, res, next) => {
    try {
        const blogposts = await getBlogposts()
        const remaining = blogposts.filter(b => b.uuid !== req.params.uuid)
        if (blogposts.length !== remaining.length) {
            await setBlogposts(remaining)
            res.status(204).send()
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.post("/:uuid/upload", multer().single("cover"), async (req, res, next) => {
    try {
        const blogposts = await getBlogposts()
        const i = blogposts.findIndex(b => b.uuid === req.params.uuid)
        if (i !== -1) {
            const filename = req.params.uuid + extname(req.file.originalname)
            await saveBlogpostImage(filename, req.file.buffer)
            blogposts[i] = {...blogposts[i], cover: `http://localhost:3420/img/blogposts/${filename}`}
            await setBlogposts(blogposts)
            res.send({message: `cover uploaded for ${req.params.uuid}`})
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.get("/:uuid/comments", async (req, res, next) => {
    try {
        const blogposts = await getBlogposts()
        const foundBlogpost = blogposts.find(b => b.uuid === req.params.uuid)
        if (foundBlogpost) {
            res.send(foundBlogpost.comments)
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.post("/:uuid/comments", checkCommentSchema,  async (req, res, next) => {
    try {
        const newComment = {...req.body, uuid: uuidv4(), createdAt: new Date(), updatedAt: new Date()}
        const blogposts = await getBlogposts()
        const i = blogposts.findIndex(b => b.uuid === req.params.uuid)
        if (i !== -1) {
            const updated = {...blogposts[i], comments: [...blogposts[i].comments, newComment], updatedAt: new Date()}
            blogposts[i] = updated
            await setBlogposts(blogposts)
            res.status(201).send({id: req.params.uuid, newComment: newComment})
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

export default blogpostsRouter
