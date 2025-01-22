import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";

import {ApiResponse} from "../utils/ApiResponse.js";







const registerUser = asyncHandler(async (req, res) => {
    
    //1. get user datails from frontend

    //2. validation - not empty

    //3. check if user already exists: username,email
    
    //4. check for images, check for avatar

    //5. upload them to cloudinary, avatar check on multer and cloudinary

    //6. create user object - create entry in db

    //7. remove password and refresh token field from response

    //8. check for user creation

    //9. return response
    
    //1
    const {fullName, username, email, password} = req.body //eeita sei user model ru ana haba

    /*if(fullName=="") {

        throw new ApiError(400,"fullName is required");

    }*/

    // new coding line, efficient

    //2
    if(
        [fullName, username, email, password].some((field)=>
        field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required");
    }

    //3
    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser) {
        throw new ApiError(409,"User already same username or email exists");
    }

    //4
    //eeita multer dela .files ra field re
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
        
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

    //5
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar){
        throw new ApiError(400,"Avatar is required");
    }

    //6

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "" //jadi cover image achi ne nahele nai

    })

    //7
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" //eeithi sei sabu lekha jae jouta darkar nathae and eemiti -deiki string lekha hue jouta tate darkar nahi, bcz bydefault sabu selected thae
    )
    //8
    if(!createdUser) {  
        throw new ApiError(500, "User not found");
    }
    
    //9
    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    );

});

export { registerUser };