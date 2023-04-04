import Express from "express";
import {v4 as uuidv4} from "uuid"
import { v2 as cloudinary } from "cloudinary"
import createHttpError from "http-errors"
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary"
import { triggerBadRequest } from "../validate.js"
import { adminAuth, basicUserAuth } from "../../lib/tools.js";
import {AuthorsModel} from "../models.js"
import q2m from "query-to-mongo"


const authorsRouter = Express.Router()

const cloudinaryUploader = multer({
    storage: new CloudinaryStorage({
        cloudinary,
        params: {
            folder: "u4d6/authors",
        },
    }),
}).single("avatar")

// -------------------- Base Author Calls --------------------

authorsRouter.post("/", basicUserAuth, adminAuth, async (req, res, next) => {
    try {
        const newAuthor = new AuthorsModel(req.body)
        const { _id } = await newAuthor.save()
        res.status(201).send({ _id })
    } catch (error) {
        next(error)
    }
})

authorsRouter.get("/", async (req, res, next) => {
    try {
        const q = q2m(req.query)
        const authors = await AuthorsModel.find(q.criteria, q.options.fields)
            .limit(q.options.limit)
            .skip(q.options.skip)
            .sort(q.options.sort)
        const total = await AuthorsModel.countDocuments(q.criteria)

        res.send({
            links: q.links(process.env.BE_URL + "/authors", total),
            total,
            numberOfPages: Math.ceil(total / q.options.limit),
            authors
        })
    } catch (error) {
        next(error)
    }
})

authorsRouter.get("/:authorId", async (req, res, next) => {
    try {
        const foundAuthor = await AuthorsModel.findById(req.params.authorId)
        if (foundAuthor) {
            res.send(foundAuthor)
        } else {
            next(createHttpError(404, `No author with id ${req.params.authorId}`))
        }
    } catch (error) {
        next(error)
    }
})

authorsRouter.put("/:authorId", basicUserAuth, async (req, res, next) => {
    try {
        const updatedAuthor = await AuthorsModel.findByIdAndUpdate(
            req.params.authorId,
            req.body,
            {new: true, runValidators: true}
        )

        if (updatedAuthor) {
            res.send(updatedAuthor)
        } else {
            next(createHttpError(404, `No author with id ${req.params.authorId}`))
        }
    } catch (error) {
        next(error)
    }
})

authorsRouter.delete("/:authorId", basicUserAuth, async (req, res, next) => {
    try {
        const deletedAuthor = await AuthorsModel.findByIdAndDelete(req.params.authorId)
        if (deletedAuthor) {
            res.status(204).send()
        } else {
            next(createHttpError(404, `No author with id ${req.params.authorId}`))
        }
    } catch (error) {
        next(error)
    }
})

// -------------------- Image Upload --------------------

authorsRouter.post("/:authorId/upload", cloudinaryUploader, async (req, res, next) => {
    try {
        const updatedAuthor = await AuthorsModel.findByIdAndUpdate(
            req.params.authorId,
            {avatar: req.file.path},
            {new: true, runValidators: true}
        )
        if (updatedAuthor) {
            res.send(updatedAuthor)
        } else {
            next(createHttpError(404, `No author with id ${req.params.authorId}`))
        }
    } catch (error) {
        next(error)
    }
})

// Not yet reimplemented due to lack of purpose

/* authorsRouter.post("/checkEmail", async (req, res, next) => {
    try {
        const authors = await getAuthors()
        if (req.body && req.body.email) {
            const unavailable = authors.some(a => a.email === req.body.email)
            res.send({unavailable: unavailable})
        } else {
            next(createHttpError(400, "No email to check provided"))
        }
    } catch (error) {
        next(error)
    }
    const authors = JSON.parse(fs.readFileSync(authorsPath))
    const unavailable = authors.some(a => a.email === req.body.email)
    res.send({unavailable: unavailable})
}) */

/* authorsRouter.get("/csv/download", async (req, res, next) => {
    try {
        res.setHeader("Content-Disposition", `attachment; filename=authors.csv`)
        const source = getAuthorsJSONReadableStream()
        const transform = new Transform({fields: ["uuid", "name", "surname", "email", "dateOfBirth", "avatar"]})
        const destination = res

        pipeline(source, transform, destination, err => {
            if (err) console.log(err)
        })
    } catch (error) {
        next(error)
    }
}) */

export default authorsRouter