import Express from "express";
import {v4 as uuidv4} from "uuid"
import { v2 as cloudinary } from "cloudinary"
import createHttpError from "http-errors"
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary"
import { checkBlogpostSchema, checkCommentSchema, triggerBadRequest } from "../validate.js"
import { getBlogposts, setBlogposts, saveBlogpostImage, getAuthorsJSONReadableStream, sendConfirmationEmail } from "../../lib/tools.js";
import { getPDFBlogpost } from "../../lib/tools.js";
import { pipeline } from "stream";
import {BlogpostsModel, CommentsModel} from "./model.js"
import q2m from "query-to-mongo"



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
        res.status(201).send({ _id })
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.get("/", async (req, res, next) => {
    try {
        const q = q2m(req.query)
        const blogposts = await BlogpostsModel.find(q.criteria, q.options.fields)
            .limit(q.options.limit)
            .skip(q.options.skip)
            .sort(q.options.sort)
        const total = await BlogpostsModel.countDocuments(q.criteria)

        res.send({
            links: q.links(process.env.BE_URL + "/blogposts", total),
            total,
            numberOfPages: Math.ceil(total / q.options.limit),
            blogposts
        })
        req.send(blogposts)
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
        res.setHeader("Content-Disposition", `attachment; filename=bp-${req.params.bpId}.pdf`)
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

// ^^^^^^^ fix this dude ^^^^^^^

blogpostsRouter.post("/:bpId/comments", async (req, res, next) => {
    try {
        const newComment = req.body
        const updatedBlogpost = await BlogpostsModel.findByIdAndUpdate(
            req.params.bpId,
            { $push: {comments: newComment}},
            { new: true, runValidators: true }
        )
        if (updatedBlogpost) {
            res.status(201).send(updatedBlogpost)
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.bpId}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.get("/:bpId/comments", async (req, res, next) => {
    try {
        const foundBlogpost = await BlogpostsModel.findById(req.params.bpId)
        if (foundBlogpost) {
            res.send(foundBlogpost.comments)
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.bpId}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.get("/:bpId/comments/:commentId", checkCommentSchema, async (req, res, next) => {
    try {
        const foundBlogpost = await BlogpostsModel.findById(req.params.bpId)
        if (foundBlogpost) {
            const foundComment = foundBlogpost.comments.find(c => c._id.toString() === req.params.commentId)
            if (foundComment) {
                res.send(foundComment)
            } else {
                next(createHttpError(404, `No comment with id ${req.params.commentId}`))
            }
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.bpId}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.put("/:bpId/comments/:commentId", checkCommentSchema, async (req, res, next) => {
    try {
        const foundBlogpost = await BlogpostsModel.findById(req.params.bpId)
        if (foundBlogpost) {
            const i = foundBlogpost.comments.findIndex(c => c._id.toString() === req.params.commentId)
            if (i !== -1) {
                foundBlogpost.comments[i] = {...foundBlogpost.comments[i].toObject(), ...req.body}
                await foundBlogpost.save()
                res.send(foundBlogpost.comments[i])
            } else {
                next(createHttpError(404, `No comment with id ${req.params.commentId}`))
            }
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.bpId}`))
        }
    } catch (error) {
        next(error)
    }
})

blogpostsRouter.delete("/:bpId/comments/:commentId", async (req, res, next) => {
    try {
        const updatedBlogpost = await BlogpostsModel.findByIdAndUpdate(
            req.params.bpId,
            { $pull: { comments: { _id: req.params.commentId } } },
            { new: true, runValidators: true}
        )
        if (updatedBlogpost) {
            res.status(204).send()
        } else {
            next(createHttpError(404, `No blogpost with id ${req.params.bpId}`))
        }
    } catch (error) {
        next(error)
    }
})

export default blogpostsRouter
