import fs from "fs-extra"
import {fileURLToPath} from "url"
import { dirname, join } from "path"
import PdfPrinter from "pdfmake"
import imageToBase64 from "image-to-base64"
import { convert } from "html-to-text"
import { createWriteStream } from "fs"
import { promisify } from "util"
import sgMail from "@sendgrid/mail"
import { pipeline } from "stream"
import atob from "atob"
import createHttpError from "http-errors"
import {AuthorsModel, BlogpostsModel} from "../api/models.js"
import jwt from "jsonwebtoken"

const { readJSON, writeJSON, writeFile, createReadStream } = fs

const folderPath = join(dirname(fileURLToPath(import.meta.url)), "../data")
const publicFolderPath = join(process.cwd(), "./public/img")
const authorImagePath = join(publicFolderPath, "./authors")
const blogpostImagePath = join(publicFolderPath, "./blogposts")
const authorsPath = join(folderPath, "authors.json")
const blogsPath = join(folderPath, "blogposts.json")

sgMail.setApiKey(process.env.SENDGRID_KEY)

export const getAuthors = () => readJSON(authorsPath)
export const setAuthors = authors => writeJSON(authorsPath, authors)

export const getBlogposts = () => readJSON(blogsPath)
export const setBlogposts = blogposts => writeJSON(blogsPath, blogposts)

export const saveAuthorImage = (fileName, fileContent) => writeFile(join(authorImagePath, fileName), fileContent)
export const saveBlogpostImage = (fileName, fileContent) => writeFile(join(blogpostImagePath, fileName), fileContent)

export const getAuthorsJSONReadableStream = () => createReadStream(authorsPath)
export const getPDFWritableStream = fileName => createWriteStream(join(folderPath, fileName))

export const createAccessToken = payload => {
    return new Promise((resolve, reject) => jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: "1 week"}, (err, token) => {
        if (err) reject(err)
        else resolve(token)
    }))
}

export const verifyAccessToken = token => {
    return new Promise((resolve, reject) => jwt.verify(token, process.env.JWT_SECRET, {expiresIn: "1 week"}, (err, payload) => {
        if (err) reject(err)
        else resolve(payload)
    }))
}

export const jwtAuth = async (req, res, next) => {
    if (!req.headers.authorization) {
        next(createHttpError(401, "No bearer token provided."))
    } else {
        const accessToken = req.headers.authorization.replace("Bearer ", "")
        try {
            const payload = await verifyAccessToken(accessToken)
            req.author = {_id: payload._id, role: payload.role}
            next()
        } catch (error) {
            console.log(error)
            next(createHttpError(401, "Invalid token."))
        }
    }
}

export const adminAuth = async (req, res, next) => {
    if (req.role === "admin") {
        next()
    } else {
        next(createHttpError(403, "Admin only."))
    }
}


export const selfOrAdminAuth = async (req, res, next) => {
    if (req.role === "admin") {
        next()
    } else {
        const author = await AuthorsModel.findById(req.params.authorId)
        if (author) {
            if (author._id.toString() === req.author._id.toString()) {
                next()
            } else {
                next(createHttpError(401, "This not you jefe"))
            }
        } else {
            next(createHttpError(404, "Not found."))
        }
    }
}

export const ownerOrAdminBlogpostAuth = async (req, res, next) => {
    if (req.author.role === "admin") {
        next()
    } else {
        const blogpost = await BlogpostsModel.findById(req.params.bpId)
        if (blogpost.author.map(authorId => authorId.toString()).includes(req.author._id.toString())) {
            next()
        } else {
            next(createHttpError(401, "Unauthorized."))
        }
    }
}

export const basicUserAuth = async (req, res, next) => {
    if (!req.headers.authorization) {
        next(createHttpError(401, "No credentials provided."))
    } else {
        const credentials = atob(req.headers.authorization.replace("Basic ", ""))
        const [email, password] = credentials.split(":")
        const author = await AuthorsModel.checkCredentials(email, password)
        if (author) {
            if (req.params.authorId) {
                const authorInQuestion = await AuthorsModel.findById(req.params.authorId)
                if (authorInQuestion._id.toString() === author._id.toString() || author.role === "admin") {
                    next()
                } else {
                    next(createHttpError(401, "Unauthorized."))
                }
            } else {
                next()
            }
        } else {
            next(createHttpError(401, "Unauthorized."))
        }
    }
}
// TODO: Check admin first, doesn't matter if author then
export const basicBlogpostAuth = async (req, res, next) => {
    if (!req.headers.authorization) {
        next(createHttpError(401, "No credentials provided."))
    } else {
        const credentials = atob(req.headers.authorization.replace("Basic ", ""))
        const [email, password] = credentials.split(":")
        const author = await AuthorsModel.checkCredentials(email, password)
        if (author) {
            if (req.params.bpId) {
                const blogpost = await BlogpostsModel.findById(req.params.bpId)
                    if (blogpost.author.map(authorId => authorId.toString()).includes(author._id.toString()) || author.role === "admin") {
                        req.author = author
                        next()
                    } else {
                        next(createHttpError(401, "Unauthorized."))
                    }
            } else {
                req.author = author
                next()
            }
        } else {
            next(createHttpError(401, "Unauthorized."))
        }
    }
}

export const getPDFBlogpost = async bp => {
    const fonts = {
        Helvetica: {
            normal: "Helvetica",
            bold: "Helvetica-Bold",
            italics: "Helvetica-Oblique",
            bolditalics: "Helvetica-BoldOblique",
        }
    }
    const printer = new PdfPrinter(fonts)

    const base64Data = await imageToBase64(bp.cover)

    // TODO: Try pdfkit
    const docDefinition = {
        content: [
            {image: `data:image/jpeg;base64,${base64Data}`,
            width: 512,
        },
        {text: bp.title,
        style: "header"},
        {
        table: {
            body: [[{image: `data:image/jpeg;base64,${await imageToBase64(bp.author.avatar)}`,
            width: 30
            },
            {text: bp.author.name + " " + bp.author.surname}]],
        },
        layout: "noBorders",
        margin: [0, 10]
        },
        {text: convert(bp.content, {selectors: [{selector: "strong", format: "blockquote"}]})}, //can't make it bold this way
        ],
        styles: {
            header: {
                fontSize: 25,
                bold: true,
                margin: [0,20,0,10],
            }
        },
        defaultStyle: {
            font: "Helvetica"
        }
    }

    const pdfReadableStream = printer.createPdfKitDocument(docDefinition)
    pdfReadableStream.end()

    return pdfReadableStream
}

export const asyncPDFGen = async (blogpost) => {
    const src = await getPDFBlogpost(blogpost)
    const dest = getPDFWritableStream(`bp-${blogpost.uuid}.pdf`)
    const promisedBasedPipeline = promisify(pipeline)

    await promisedBasedPipeline(src, dest)
}

export const sendConfirmationEmail = async (blogpost, recipient) => {
    await asyncPDFGen(blogpost)
    const pdfToSend = join(folderPath, `bp-${blogpost.uuid}.pdf`)
    const pdfString = fs.readFileSync(pdfToSend).toString("base64")

    const msg = {
        to: recipient,
        from: process.env.SENDER_EMAIL,
        subject: `Your new Blogpost "${blogpost.title}"`,
        text: "Here is what you wrote:",
        html: blogpost.content,
        attachments: [
            {
              content: pdfString,
              filename: "blogpost.pdf",
              type: "application/pdf",
              disposition: "attachment"
            }
          ]
    }
    try {
        await sgMail.send(msg)
    } catch (error) {
        console.log(error)
    }
}