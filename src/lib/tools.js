import fs from "fs-extra"
import {fileURLToPath} from "url"
import { dirname, join } from "path"

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