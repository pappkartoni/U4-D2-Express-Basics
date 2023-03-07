import fs from "fs-extra"
import {fileURLToPath} from "url"
import { dirname, join } from "path"
import PdfPrinter from "pdfmake"
import imageToBase64 from "image-to-base64"
import HTML from "html-parse-stringify"
import { convert } from "html-to-text"

const { readJSON, writeJSON, writeFile } = fs

const folderPath = join(dirname(fileURLToPath(import.meta.url)), "../data")
const publicFolderPath = join(process.cwd(), "./public/img")
const authorImagePath = join(publicFolderPath, "./authors")
const blogpostImagePath = join(publicFolderPath, "./blogposts")
const authorsPath = join(folderPath, "authors.json")
const blogsPath = join(folderPath, "blogposts.json")


export const getAuthors = () => readJSON(authorsPath)
export const setAuthors = authors => writeJSON(authorsPath, authors)


export const getBlogposts = () => readJSON(blogsPath)
export const setBlogposts = blogposts => writeJSON(blogsPath, blogposts)

export const saveAuthorImage = (fileName, fileContent) => writeFile(join(authorImagePath, fileName), fileContent)
export const saveBlogpostImage = (fileName, fileContent) => writeFile(join(blogpostImagePath, fileName), fileContent)

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
/*     const splitHtml = HTML.parse(bp.content)
    const pretty = splitHtml.map(el => {
        return {
            text: el.children[0].content ? el.children.map(c => c.content).join() : el.children.map(c => c.children[0].content).join(), 
            style: el.namem
        }
    }) */ //this was going nowhere

    console.log(convert(bp.content));

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
/*         ...pretty, */
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

    const pdfReadableStream = printer.createPdfKitDocument(docDefinition, [])
    pdfReadableStream.end()

    return pdfReadableStream
}