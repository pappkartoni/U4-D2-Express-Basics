import mongoose from "mongoose"

const {Schema, model} = mongoose


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
        cover: { type: String, required: true},
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
        author: {
            name: {type: String},
            avatar: {type: String},
            email: {type: String, required: true}
        },
        content: { type: String, required: true},
        comments: { default: [], type: [commentSchema] }, // comments: [commentSchema] <- without [] initially
    },
    {
        timestamps: true
    }
)

export const BlogpostsModel =  model("Blogpost", blogpostSchema)
export const CommentsModel = model("Comment", commentSchema)