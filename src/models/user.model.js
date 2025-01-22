import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String, //cloudinary url
        required: true,
    },
    coverImage:{
        type:String, //cloudinary url
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
],
    password: {
        type: String,
        required: [true, "Password is required"],
    },

    refreshToken: {
        type: String,  
    }
}, {timestamps: true})

//.pre re ("validate/save/remove/upadteOne/deleteOne/init", function) hn eeithi arrow function lekhibuni bcz eeithi ,this ra darkar padiba and arrow function re .this nathae

//pass encryption
userSchema.pre("save", async function(next) {
   // const salt = await bcrypt.genSalt(10);
   if(!this.isModified("password")) return next(); //dekh eeita add hela bcz ame sabubele pass ku hash karibaku chahunu, jetebele 1st use hela setebele nahele jetebele update karibaa pass ku setebele ame kariba, sethipain if re ame check karilu jadi modify heini tahele eeita kareni next ku pala

    this.password = await bcrypt.hash(this.password, 10);
    next();
})


//custome funtion, isPasswordCorrect seita random name 
userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName,
    }, 
    process.env.ACCESS_TOKEN_SECRET, 
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    });
}

userSchema.methods.generateRefreshToken = function() { 
    return jwt.sign({
        _id: this._id
    }, 
    process.env.REFRESH_TOKEN_SECRET, 
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    });
} 

export const User = mongoose.model("User", userSchema); //this can direclt contact with my database

