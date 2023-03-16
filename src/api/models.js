import mongoose from "mongoose"

const {Schema, model} = mongoose

const authorSchema = new Schema(
    {
        name: {type: String, required: true},
        surname: {type: String, required: true},
        email: {type: String, required: true},
        dateOfBirth: {type: Date, required: true},
        avatar: {type: String}
    },
    {
        timestamps: true
    }
)

const commentSchema = new Schema(
    {
        name: {type: String, required: true},
        text: {type: String, required: true}
    },
    {
        timestamps: true
    }
)
const blogpostSchema = new Schema(
    {
        category: { type: String, required: true},
        title: { type: String, required: true},
        cover: { type: String},
        readTime: {
            value: {type: Number, required: true},
            unit: {
                type: String,
                required: true,
                validate: {
                    validator: function (unit) {
                    return ["seconds", "minutes", "hours"].includes(unit);
                    },
                    message: "Unit must be one of 'seconds', 'minutes', or 'hours'",
                },
            },
        },
        author: {type: Schema.Types.ObjectId, ref: "Author", required: true},
        likes: [{type: Schema.Types.ObjectId, ref: "Author"}],
        content: { type: String, required: true},
        comments: { default: [], type: [commentSchema] }, // comments: [commentSchema] <- without [] initially
    },
    {
        timestamps: true
    }
)

export const AuthorsModel = model("Author", authorSchema)
export const BlogpostsModel =  model("Blogpost", blogpostSchema)