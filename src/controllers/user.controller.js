import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";



const generateAccessAndRefreshToken = async(userId) => {
    try {

        const user = await User.findById(user._id);
        const accessToken =  user.generateAccessToken();
        const refreshToken =  user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        return {accessToken, refreshToken};
        
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
}



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

//16th vdo

const loginUser = asyncHandler(async (req, res) => {

    //1. req body ru data anibu
    //2. username or email
    //3. find the user
    //4. check for password
    //5. generate access token
    //6. generate refresh token
    //7. send response in cookies

    //1,2
    const {username,email, password} = req.body;

    if (!username || !email) {
        throw new ApiError(400, "Username or Email is required");  
    }

    //3
    const user = await User.findOne({
       //$or mongo db operator
        $or:[{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User not found");
        
    }

    //4

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
        
    }

    //5,6
    const {accessToken, refreshToken} =await 
    generateAccessAndRefreshToken(user._id);

    //7 
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken" 
    )

   const options = {
    httpOnly: true,
    secure: true,
   } //now cookies can olny be modified by the server and not by frontend 

   return res
   .status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
   )
})

const logoutUser = asyncHandler(async (req, res) => {
  
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200,
            {},
            "User logged out successfully"
        )
    )

})

export { 
    registerUser ,
    loginUser,
    logoutUser
};