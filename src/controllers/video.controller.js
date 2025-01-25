import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
//import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { v2 as cloudinary } from 'cloudinary';
import {Like } from "../models/like.model.js";
import {Comment} from "../models/comment.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    /*
        page: The current page number for pagination (default: 1).
        limit: The number of videos to display per page (default: 10).
        query: A search term to filter videos by title or description.
        sortBy: The field to sort the videos (e.g., views, createdAt).
        sortType: The order of sorting (asc for ascending, desc for descending).
        userId: If provided, retrieves videos uploaded by this user.
    */

    //Converts page and limit to numbers if they're strings and ensures they are positive.
    //Sets page to 1 and limit to 10 if invalid values are provided.
    page = isNaN(page) ? 1 : Number(page);
    limit = isNaN(limit) ? 10 : Number(limit);
    if(page <= 0){
        page = 1;
    }
    if(limit <= 0){
        page = 10;
    }

    const matchStage = {}; //Filters the videos based on userId or query.

    //If a valid userId is provided, filters videos where the owner field matches the given user ID.

    if(userId && isValidObjectId(userId)){
        matchStage["$match"] = {
            owner:new mongoose.Types.ObjectId(userId)
        }
    }
    else if(query) { //If a query is provided, uses a case-insensitive regular expression to search for the term in the title or description.
        matchStage["$match"] = {
            $or:[
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        }
    }
    else {
        matchStage["$match"] = {}
    }

    if(userId && query){
        matchStage["$match"] = {
            $and:[
                {owner: new mongoose.Types.ObjectId(userId)},
                {
                    $or:[
                        { title: { $regex: query, $options: 'i' } },
                        { description: { $regex: query, $options: 'i' } }
                    ]
                }
            ]
        }
    }

    const joinOwnerStage = { //Performs a join with the users collection to retrieve owner details (username, avatar, and fullname) for each video.
        $lookup : {
            from : "users",
            localField : "owner",
            foreignField : "_id",
            as : "owner",
            pipeline : [
                {
                    $project : {
                        username : 1,
                        avatar : 1,
                        fullname : 1
                    }
                }
            ]
        }
    }

    const addFieldStage = {
        $addFields : {
            owner : {
                $first : "$owner"
            }
        }
    }
        
    const sortStage = {};
    /*If sortBy and sortType are provided, sorts videos accordingly.
Defaults to sorting by createdAt in descending order. */
    if(sortBy && sortType){
        sortStage["$sort"] = {
            [sortBy]: sortType === "asc" ? 1 : -1
        }
    }else{
        sortStage["$sort"] = {
            createdAt: -1
        }
    }

    /*$skip: Skips videos for previous pages.
    $limit: Limits the number of videos displayed per page. */

    const skipStage = { $skip: (page - 1) * limit };
    const limitStage = { $limit: limit };

    const videos = await Video.aggregate([
        matchStage,
        joinOwnerStage,
        addFieldStage,
        sortStage,
        skipStage,
        limitStage
    ]);

    res.status(200).json(new ApiResponse(
        200,
        videos,
        "Get videos success"
    ));
})

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video

     //take video details
    //check if the file is not empty
    //take and upload video on cloudinary
    //verify if uploaded correctly
    //save video details in database

    const {title, description} = req.body;
    if(!title?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title and description are required")
    }
    
    if(!(req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0)){
        throw new ApiError(400, "Video file is required!!!");
    }
    /*
        { //req.files sample
    thumbnail: [
        {
            fieldname: "thumbnail",
            originalname: "image.jpg",
            encoding: "7bit",
            mimetype: "image/jpeg",
            destination: "./public/temp",
            filename: "image.jpg",
            path: "./public/temp/image.jpg",
            size: 204800
        }
    ],
    videoFile: [
        {
            fieldname: "videoFile",
            originalname: "video.mp4",
            encoding: "7bit",
            mimetype: "video/mp4",
            destination: "./public/temp",
            filename: "video.mp4",
            path: "./public/temp/video.mp4",
            size: 1024000
        }
    ]
}

    */
    const videoFileLocalPath = req.files.videoFile[0].path;

    if(!(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0)){
        throw new ApiError(400, "Thumbnail of a video is required!!!");
    }

    const thumbnailLocalPath = req.files.thumbnail[0].path;

    const uploadedVideo = await uploadOnCloudinary(videoFileLocalPath);
    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if(!uploadedVideo || !uploadedThumbnail) {
        throw new ApiError(500, "Something went wrong while uploading video");
    }

    //we need to create video obj and entry in DB

    const videoObj={
        videoFile: uploadedVideo.url,
        thumbnail: uploadedThumbnail.url,
        title: title.trim(),
        description: description.trim(),
        duration:Math.round(uploadedVideo.duration),
        owner:req.user._id
    }

    const video = await Video.create(videoObj);
    // await cloudinary.uploader.destroy(publicId);
    if(!video) {
        await cloudinary.uploader.destroy(uploadedVideo.url);
        await cloudinary.uploader.destroy(uploadedThumbnail.url);
        throw new ApiError(500, "Failed to create video entry in DB");
    }


    res
    .status(200)
    .json(
        new ApiResponse(
        201,
        video,
       "Video uploaded successfully",
    ))

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: get video by id
    if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    let video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                },
                likes: {
                    $size: "$likes"
                },
                views: {
                    $add: [1, "$views"]
                }
            }
        }
    ])

    if(video.lenght > 0)
    {
        video = video[0];
    }

    await Video.findByIdAndUpdate(videoId, {
        $set:{
            views: video.views
        }
    });

    res.status(200).json(new ApiResponse(
        200,
        video,
        "Get single video success"
    ));

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    /* req.file structure
    {
    fieldname: "thumbnail",       // The name of the field in the form
    originalname: "image.jpg",    // The original name of the uploaded file
    encoding: "7bit",             // File encoding type
    mimetype: "image/jpeg",       // MIME type of the file
    destination: "./public/temp", // The folder where the file is stored temporarily
    filename: "image.jpg",        // The name of the file saved in the temp folder
    path: "./public/temp/image.jpg", // Full path to the file in the temp folder
    size: 204800                  // File size in bytes
    }
    
    */
    if(!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    let video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    const {title, description} = req.body;
    if(!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }
    const fieldsToUpdate = {};

    if(title?.trim()) {
        fieldsToUpdate["title"] = title.trim();
    }
    if(description?.trim()) {
        fieldsToUpdate["description"] = description.trim();
    }

    const thumbnailLocalPath = req.file?.path;
    if(thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if(!thumbnail) {
            throw new ApiError(500, "Failed to upload thumbnail on cloudinary");
        }
        await cloudinary.uploader.destroy(video.thumbnail); //delete the old video thumbnail
        fieldsToUpdate["thumbnail"] = thumbnail.url;
    }

    video = await Video.findByIdAndUpdate(videoId, {
        $set: {...fieldsToUpdate}
    }, {
        new: true
    });//update the video document with the new fields

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video updated successfully"
        )   

    );

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if(!videoId?.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    if(video.owner?._id.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video, only owner can delete this video");
    }

    const {_id, videoFile, thumbnail} = video;
    const delResponse = await Video.findByIdAndDelete(_id); //delete from database
    if(!delResponse) {
        throw new ApiError(500, "Failed to delete video");
    }
    else{
        await cloudinary.uploader.destroy(videoFile,{resource_type: 'video'});
        await cloudinary.uploader.destroy(thumbnail);
        await Like.deleteMany({video: _id});
        await Comment.deleteMany({video: _id});
    }

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        )
    )
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!videoId?.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    let video = await Video.findById(videoId);

    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    video.isPublished = !(video.isPublished); //video.model ra parameter eeita

    await video.save();

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            video,
            "Video status updated successfully"
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
}