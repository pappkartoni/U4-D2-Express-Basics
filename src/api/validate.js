import { checkSchema, validationResult } from "express-validator"
import createHttpError from "http-errors"

const authorSchema = {
    name: {
        in: ["body"],
        isString: {
          errorMessage: "name must be String",
        },
    },
    surname: {
        in: ["body"],
        isString: {
          errorMessage: "surname must be String",
        },
    },
    email: {
        in: ["body"],
        isEmail: {
          errorMessage: "email must be String",
        },
    },
    dateOfBirth: {
        in: ["body"],
        isString: {
          errorMessage: "dob must be Date",
        },
    },
    avatar: {
        in: ["body"],
        optional: { options: { nullable: true } },
        isURL: {
          errorMessage: "avatar must be valid url to image",
        },
    }
    
}

const blogpostSchema = {
    category: {
        in: ["body"],
        isString: {
          errorMessage: "category must be String",
        },
    },
    title: {
        in: ["body"],
        isString: {
          errorMessage: "title must be String",
        },
    },
    cover: {
        in: ["body"],
        isURL: {
          errorMessage: "cover must be valid url to image",
        },
    },
    "readTime.value": {
        in: ["body"],
        isInt: {
          errorMessage: "readtime value must be Integer",
        },
    },
    "readTime.unit": {
        in: ["body"],
        isString: {
            errorMessage: "readtime unit must be String",
        },
    },
    content: {
        in: ["body"],
        isString: {
          errorMessage: "content must be String",
        },
    },
}

const commentSchema = {
  name: {
    in: ["body"],
    isString: {
      errorMessage: "comment name must be String"
    }
  },
  text: {
    in: ["body"],
    isString: {
      errorMessage: "comment text must be String"
    }
  }
}

export const checkAuthorSchema = checkSchema(authorSchema)
export const checkBlogpostSchema = checkSchema(blogpostSchema)
export const checkCommentSchema = checkSchema(commentSchema)

export const triggerBadRequest = (req, res, next) => {
    const errors = validationResult(req)

    if (errors.isEmpty()) {
        next()
    } else {
        next(createHttpError(400, "Errors during validation", { errorsList: errors.array() }))
    }
}