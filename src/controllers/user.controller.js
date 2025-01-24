import { asyncHandler } from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {ApiResponse} from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
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

    if (!username && !email) {
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
    generateAccessAndRefereshTokens(user._id);

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
            $unset:{
                refreshToken: 1 //this removes the field from document
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

//17th vdo

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken; 
    
    if ( !incomingRefreshToken ) {
        throw new ApiError(401, "Refresh token is required");
    }
    
    //jwt site re jaiki dekhibu kemiti decoded kara jae, janiparibu
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, 
            process.env.REFRESH_TOKEN_SECRET
        );
        
        const user = await User.findById(decodedToken._id);
        
        if (!user) {
            throw new ApiError(401, "User not found or refresh token");
        }
    
        if(incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or invalid pr used");
        }
    
        const options ={
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newrefreshToken} =await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken: newrefreshToken
                },
                "Access token refreshed successfully"
            )
        )
    } catch (error) {

        throw new ApiError(401,error?.message || "Refresh token is expired or invalid or used");
        
    }
})

//18th vdo
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPAssword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPAssword)

    if (!isPasswordCorrect) {   
        throw new ApiError(401, "Old password is incorrect");
        
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});
    return res.status(200).json(
        new ApiResponse(
            200,
            {},
            "Password changed successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json( 
        new ApiResponse(
            200,
            req.user,
            "Current user data fetched successfully"
        )
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {

    const {fullName, email} = req.body;

    if(!fullName || !email) {
        throw new ApiError(400, "Please provide all fields");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName: fullName,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Account details updated successfully"
        )
    )    

})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {

        throw new ApiError(400, "Avatar file is missing");
        
    }


    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Avatar upload failed");
    }

    const oldAvatarData = await User.findById(req.user?._id).select("avatar");
    const oldAvatarUrl = oldAvatarData?.avatar;

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },

        {
            new: true
        }

    ).select("-password")

    //DELETE OLD AVATAR
    if (oldAvatarUrl) {
        const publicId = oldAvatarUrl.split('/').pop().split('.')[0]; // Extract the public ID from cloudinary
        try {
            await cloudinary.uploader.destroy(publicId); // Delete the old avatar
        } catch (error) {
            throw new ApiError(500, "Failed to delete old avatar from Cloudinary");
        }
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user,
            "Avatar updated successfully"
        )
    )


});

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image 

    //eeithi coverImage ra same spelling lekhibu jouta tu user model re lekhichu
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

//20th vdo
const getUserChannelProfile = asyncHandler(async (req, res) => {


    const {username} = req.params; //url ru username baharkaribu
    if (!username?.trim()) {    

        throw new ApiError(400, "Username is missing !");
        
    }
    //pipeline
   const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        { //count the subscribers and subscribedTo
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers" //subscriber is a field now so i have used $ sign
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
               isSubscribed: { //sei button ta jou isSubscribed or subscribed na nai janibaku
                    $cond:{
                        if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }

        }
   ])

   //channel is a array of objects [{},{},.....]

   if (!channel?.lenght) {
     throw new ApiError(404, "Channel not found");
    
   }

   return res
   .status(200)
   .json(
    new ApiResponse(
        200,
        channel[0], //object
        "Channel profile fetched successfully"
    )
   )
})


//21st vdo - watch history

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos", 
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})






export { 
    registerUser ,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
    
};