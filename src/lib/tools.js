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
            {text: bp.author.name}]],
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