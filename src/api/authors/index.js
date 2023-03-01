import Express from "express";
import fs from "fs"
import {fileURLToPath} from "url"
import {dirname, join} from "path"
import {v4 as uuidv4} from "uuid"
import createHttpError from "http-errors"
import { checkAuthorSchema, triggerBadRequest } from "../validate.js"

const authorsRouter = Express.Router()
const authorsPath = join(dirname(fileURLToPath(import.meta.url)), "authors.json")

const getAuthors = () => JSON.parse(fs.readFileSync(authorsPath))
const setAuthors = authors => fs.writeFileSync(authorsPath, JSON.stringify(authors))

authorsRouter.post("/", checkAuthorSchema, triggerBadRequest, (req, res, next) => {
    try {
        const newAuthor = {...req.body, uuid: uuidv4()}
        const authors = getAuthors()
        const unavailable = authors.some(a => a.email === req.body.email)
        if (!unavailable) {
            authors.push(newAuthor)
            setAuthors(authors)

            res.status(201).send({name: newAuthor.name + " " + newAuthor.surname, avatar: newAuthor.avatar, uuid: newAuthor.uuid})
        } else {
            next(createHttpError(400, `Email ${req.body.email} is already in use`))
        }
    } catch (error) {
        next(error)
    }

})

authorsRouter.get("/", (req, res, next) => {
    try {
        const authors = getAuthors()
        res.send(authors)
    } catch (error) {
        next(error)
    }
})

authorsRouter.get("/:uuid", (req, res, next) => {
    try {
        const authors = getAuthors()
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

authorsRouter.put("/:uuid", checkAuthorSchema, triggerBadRequest, (req, res, next) => {
    try {
        const authors = getAuthors()
        const i = authors.findIndex(a => a.uuid === req.params.uuid)
        if (i !== -1) {
            const updated = {...authors[i], ...req.body}
            authors[i] = updated
            setAuthors(authors)
            res.send(updated)
        } else {
            next(createHttpError(404, `No author with id ${req.body.uuid}`))
        }
    } catch (error) {
        next(error)
    }
})

authorsRouter.delete("/:uuid", (req, res, next) => {
    try {
        const authors = getAuthors()
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

authorsRouter.post("/checkEmail", (req, res, next) => {
    try {
        const authors = getAuthors()
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

export default authorsRouter