import mongoose from "mongoose"
import bcrypt from "bcrypt"

const {Schema, model} = mongoose

const authorSchema = new Schema(
    {
        name: {type: String, required: true},
        surname: {type: String, required: true},
        email: {type: String, required: true},
        password: {type: String, required: true},
        dateOfBirth: {type: Date, required: true},
        avatar: {type: String},
        role: {type: String, required: true, enum: ["admin", "author",], default: "author"}
    },
    {
        timestamps: true
    }
)

authorSchema.pre("save", async function () {
    const newAuthorData = this
    if (newAuthorData.isModified("password")) {
        const plainPw = newAuthorData.password
        const hash = await bcrypt.hash(plainPw, 11)
        newAuthorData.password = hash
    }
})
authorSchema.pre("findOneAndUpdate", async function () {
    const update = {...this.getUpdate()}
    if (update.password) {
        const plainPw = update.password
        const hash = await bcrypt.hash(plainPw, 11)
        console.log(hash)
        update.password = hash
        this.setUpdate(update)
    }
})

authorSchema.methods.toJSON = function() {
    const current = this.toObject()
    delete current.password
    delete current.createdAt
    delete current.updatedAt
    delete current.__v

    return current
}

authorSchema.static("checkCredentials", async function(email, plainPw) {
    const author  = await this.findOne({email})
    if (author) {
        const match = await bcrypt.compare(plainPw, author.password)

        if (match) {
            return author
        } else {
            return null
        }
    } else {
        return null
    }
})

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
        author: [{type: Schema.Types.ObjectId, ref: "Author", required: true}],
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