import Express from "express";
import fs from "fs"
import {fileURLToPath} from "url"
import {dirname, extname, join} from "path"
import {v4 as uuidv4} from "uuid"
import { v2 as cloudinary } from "cloudinary"
import createHttpError from "http-errors"
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary"
import { checkBlogpostSchema, checkCommentSchema, triggerBadRequest } from "../validate.js"
import { getBlogposts, setBlogposts, saveBlogpostImage, getAuthorsJSONReadableStream, sendConfirmationEmail } from "../../lib/tools.js";
import { getPDFBlogpost } from "../../lib/tools.js";
import { pipeline } from "stream";
import { Transform } from "@json2csv/node";
import BlogpostsModel from "./model.js"



const blogpostsRouter = Express.Router()

const cloudinaryUploader = multer({
    storage: new CloudinaryStorage({
        cloudinary,
        params: {
            folder: "u4d6/blogposts",
        },
    }),
}).single("cover")

blogpostsRouter.post("/", triggerBadRequest, async (req, res, next) => {
    try {
        const newBlogpost = new BlogpostsModel(req.body)
        const { _id } = await newBlogpost.save()
        //await sendConfirmationEmail(newBlogpost, newBlogpost.author.email)

        res.status(201).send({ _id })
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.get("/", async (req, res, next) => {
    try {
        if (req.query && req.query.category) {
            //const filtered = blogposts.filter(b => b.title.toLowerCase().includes(req.query.title.toLowerCase()))
            const filtered = await BlogpostsModel.find({category: req.query.category})
            res.send(filtered)
        } else {
            const blogposts = await BlogpostsModel.find()
            res.send(blogposts)
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.get("/:bpId", async (req, res, next) => {
    try {
        const foundBlogpost = await BlogpostsModel.findById(req.params.bpId)
        if (foundBlogpost) {
            res.send(foundBlogpost)
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.bpId}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.put("/:bpId", triggerBadRequest, async (req, res, next) => {
    try {
        const updatedBlogpost = await BlogpostsModel.findByIdAndUpdate(
            req.params.bpId,
            req.body,
            {new: true, runValidators: true}
        )

        if (updatedBlogpost) {
            res.send(updatedBlogpost)
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.bpId}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.delete("/:bpId", async (req, res, next) => {
    try {
        const deletedBlogpost = await BlogpostsModel.findByIdAndDelete(req.params.bpId)
        if (deletedBlogpost) {
            res.status(204).send()
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.bpId}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.get("/:bpId/pdf", async (req, res, next) => {
    try {
        res.setHeader("Content-Disposition", `attachment; filename=bp-${req.params.uuid}.pdf`)
        const blogposts = await getBlogposts()
        const foundBlogpost = await BlogpostsModel.findById(req.params.bpId)
        if (foundBlogpost) {
            const source = await getPDFBlogpost(foundBlogpost)
            const destination = res //why

            pipeline(source, destination, err => {
                if (err) console.log(err)
            })
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.bpId}`))
        }
    } catch (error) {
        next(error)
    }
})

// vvvvvvv this is not working yet vvvvvvv

blogpostsRouter.post("/:bpId/upload", cloudinaryUploader, async (req, res, next) => {
    try {
        const blogposts = await getBlogposts()
        const i = blogposts.findIndex(b => b._id === req.params.bpId)
        if (i !== -1) {
            console.log("FILE", req.file)
            blogposts[i] = {...blogposts[i], cover: req.file.path}
            await setBlogposts(blogposts)
            res.send({message: `cover uploaded for ${req.params.bpId}`})
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.bpId}`))
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

blogpostsRouter.put("/:uuid/comments/:commentId", checkCommentSchema, async (req, res, next) => {
    try {
        const blogposts = await getBlogposts()
        const i = blogposts.findIndex(b => b.uuid === req.params.uuid)
        if (i !== -1) {
            const comments = blogposts[i].comments
            const j = comments.findIndex(c => c.uuid === req.params.commentId)
            if (j !== -1) {
                const updatedComment = {...comments[j], ...req.body, updatedAt: new Date()}
                comments[j] = updatedComment
                blogposts[i].comments = comments
                await setBlogposts(blogposts)
                res.send(updatedComment)
            } else {
                next(createHttpError(404, `No comment with id ${req.params.commentId}`))
            }
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.delete("/:uuid/comments/:commentId", async (req, res, next) => {
    try {
        const blogposts = await getBlogposts()
        const i = blogposts.findIndex(b => b.uuid === req.params.uuid)
        if (i !== -1) {
            const comments = blogposts[i].comments
            const remaining = comments.filter(c => c.uuid !== req.params.commentId)
            if (comments.length !== remaining.length) {
                blogposts[i].comments = remaining
                await setBlogposts(blogposts)
                res.status(204).send()
            } else {
                next(createHttpError(404, `No blogpost with id ${req.params.uuid}`))
            }
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

export default blogpostsRouter
