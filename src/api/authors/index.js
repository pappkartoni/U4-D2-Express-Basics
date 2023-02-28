import Express from "express";
import fs from "fs"
import {fileURLToPath} from "url"
import {dirname, join} from "path"
import {v4 as uuidv4} from "uuid"

const authorsRouter = Express.Router()
const authorsPath = join(dirname(fileURLToPath(import.meta.url)), "authors.json")

authorsRouter.get("/", (req, res) => {
    const authors = JSON.parse(fs.readFileSync(authorsPath))
    res.send(authors)
})

authorsRouter.get("/:uuid", (req, res) => {
    const authors = JSON.parse(fs.readFileSync(authorsPath))
    const author = authors.find(a => a.uuid === req.params.uuid)
    res.send(author)
})

authorsRouter.post("/", (req, res) => {
    const authors = JSON.parse(fs.readFileSync(authorsPath))
    const newAuthor = {...req.body, uuid: uuidv4()}
    authors.push(newAuthor)
    fs.writeFileSync(authorsPath, JSON.stringify(authors))
    res.status(201).send({fullName: newAuthor.name + " " + newAuthor.surname, uuid: newAuthor.uuid})
})

authorsRouter.put("/:uuid", (req, res) => {
    const authors = JSON.parse(fs.readFileSync(authorsPath))
    const i = authors.findIndex(a => a.uuid === req.params.uuid)
    const updated = {...authors[i], ...req.body}
    authors[i] = updated
    fs.writeFileSync(authorsPath, JSON.stringify(authors))
    res.send(updated)
})

authorsRouter.delete("/:uuid", (req, res) => {
    const authors = JSON.parse(fs.readFileSync(authorsPath))
    fs.writeFileSync(authorsPath, JSON.stringify(authors.filter(a => a.uuid !== req.params.uuid)))
    res.status(204).send()
})

authorsRouter.post("/checkEmail", (req, res) => {
    const authors = JSON.parse(fs.readFileSync(authorsPath))
    const unavailable = authors.some(a => a.email === req.body.email)
    res.send({unavailable: unavailable})
})

export default authorsRouter