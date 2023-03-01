import { checkSchema, validationResult } from "express-validator"
import createHttpError from "http-errors"

const authorSchema = {
    name: {
        in: ["body"],
        isString: {
          errorMessage: "Must be String",
        },
    },
    surName: {
        in: ["body"],
        isString: {
          errorMessage: "Must be String",
        },
    },
    email: {
        in: ["body"],
        isEmail: {
          errorMessage: "Must be String",
        },
    },
    dateOfBirth: {
        in: ["body"],
        isDate: {
          errorMessage: "Must be Date",
        },
    },
    avatar: {
        in: ["body"],
        isURL: {
          errorMessage: "Must be valid url to image",
        },
    }
    
}

const blogpostSchema = {
    category: {
        in: ["body"],
        isString: {
          errorMessage: "Must be String",
        },
    },
    title: {
        in: ["body"],
        isString: {
          errorMessage: "Must be String",
        },
    },
    cover: {
        in: ["body"],
        isURL: {
          errorMessage: "Must be valid url to image",
        },
    },
    "readTime.value": {
        in: ["body"],
        isInt: {
          errorMessage: "Must be Integer",
        },
    },
    "readTime.unit": {
        in: ["body"],
        isString: {
            errorMessage: "Must be String",
        },
    },
    content: {
        in: ["body"],
        isString: {
          errorMessage: "Must be String",
        },
    },
}

export const checkAuthorSchema = checkSchema(authorSchema)
export const checkBlogpostSchema = checkSchema(blogpostSchema)

export const triggerBadRequest = (req, res, next) => {
    const errors = validationResult(req)

    if (errors.isEmpty()) {
        next()
    } else {
        next(createHttpError(400, "Errors during validation", { errorsList: errors.array() }))
    }
}