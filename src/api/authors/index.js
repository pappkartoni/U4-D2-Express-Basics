import Express from "express";
import fs from "fs"
import {fileURLToPath} from "url"
import {dirname, extname, join} from "path"
import {v4 as uuidv4} from "uuid"
import createHttpError from "http-errors"
import multer from "multer"
import { checkAuthorSchema, triggerBadRequest } from "../validate.js"
import { getAuthors, saveAuthorImage, setAuthors } from "../../lib/tools.js"

const authorsRouter = Express.Router()

authorsRouter.post("/", checkAuthorSchema, triggerBadRequest, async (req, res, next) => {
    try {
        const newAuthor = {...req.body, uuid: uuidv4()}
        const authors = await getAuthors()
        const unavailable = authors.some(a => a.email === req.body.email)
        if (!unavailable) {
            authors.push(newAuthor)
            await setAuthors(authors)

            res.status(201).send({name: newAuthor.name + " " + newAuthor.surname, avatar: newAuthor.avatar, uuid: newAuthor.uuid})
        } else {
            next(createHttpError(400, `Email ${req.body.email} is already in use`))
        }
    } catch (error) {
        next(error)
    }

})

authorsRouter.get("/", async (req, res, next) => {
    try {
        const authors = await getAuthors()
        res.send(authors)
    } catch (error) {
        next(error)
    }
})

authorsRouter.get("/:uuid", async (req, res, next) => {
    try {
        const authors = await getAuthors()
        const foundAuthor = authors.find(a => a.uuid === req.params.uuid)
        if (foundAuthor) {
            res.send(foundAuthor)
        } else {
            next(createHttpError(404, `No author with id ${req.body.uuid}`))
        }
        
    } catch (error) {
        next(error)
    }
})

authorsRouter.put("/:uuid", checkAuthorSchema, triggerBadRequest, async (req, res, next) => {
    try {
        const authors = await getAuthors()
        const i = authors.findIndex(a => a.uuid === req.params.uuid)
        if (i !== -1) {
            const updated = {...authors[i], ...req.body}
            authors[i] = updated
            await setAuthors(authors)
            res.send(updated)
        } else {
            next(createHttpError(404, `No author with id ${req.body.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

authorsRouter.delete("/:uuid", async (req, res, next) => {
    try {
        const authors = await getAuthors()
        const remaining = authors.filter(a => a.uuid !== req.params.uuid)
        if (authors.length !== remaining.length) {
            res.status(204).send()
        } else {
            next(createHttpError(404, `No author with id ${req.body.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

authorsRouter.post("/checkEmail", async (req, res, next) => {
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
})

authorsRouter.post("/:uuid/upload", multer().single("avatar"), async (req, res, next) => {
    try {
        const authors = await getAuthors()
        const i = authors.findIndex(a => a.uuid === req.params.uuid)
        if (i !== -1) {
            const filename = req.params.uuid + extname(req.file.originalname)
            await saveAuthorImage(filename, req.file.buffer)
            authors[i] = {...authors[i], avatar: `http://localhost:3420/img/authors/${filename}`}
            await setAuthors(authors)
            res.send({message: `avatar uploaded for ${req.params.uuid}`})
        } else {
            next(createHttpError(404, `No author with id ${req.params.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

export default authorsRouter