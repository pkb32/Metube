import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Comment} from "../models/comment.model.js"
import {Tweet} from "../models/tweet.model.js"
import { Video } from "../models/video.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
     //TODO: toggle like on video
    const {videoId} = req.params
    if(!videoId?.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(400,'Invalid video id')
    }

    //ensuring if there is the video available to like
    const video  = await Video.findById(videoId);
    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    let isLiking;
    const isLikedAlready = await Like.findOne({ //This query checks the Like collection to see if there is already a record of the user liking the video.
        video:videoId,
        likedBy: req.user?._id
        /*video: videoId: Filters for the specific video.
        likedBy: req.user?._id: Filters for the current user (assuming req.user contains the authenticated user's details).
        If a record is found, it means the user has already liked the video */
    });
    if(isLikedAlready){ //dislike
        await Like.deleteOne({video: isLikedAlready.video, likedBy: isLikedAlready.likedBy}); //The code then removes the existing "like" record from the Like collection using deleteOne, means to dislike 
        isLiking = false;
    }else{
        await Like.create({video: videoId, likedBy: req.user?._id});
        isLiking = true;
    }

    const message = isLiking ? "Add like to video success" : "Remove like from video success";
    res.status(200).json(new ApiResponse(
        200,
        {},
        message
    ));
   
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on comment
    const {commentId} = req.params
    if(!commentId?.trim() || !isValidObjectId(commentId)) {
        throw new ApiError(400,'Invalid comment id, Comment not found')
    }

    const comment  = await Comment.findById(commentId);
    if(!comment) {
        throw new ApiError(404, "Comment not found");
    }
    let isLiking;
    const isLikedAlready = await Like.findOne({ //This query checks the Like collection to see if there is already a record of the user liking the comment.
        
        comment: commentId,
        likedBy: req.user?._id
    
    });

    if(isLikedAlready){
        await Like.deleteOne({comment: isLikedAlready.comment, likedBy: isLikedAlready.likedBy}); //The code then removes the existing "like" record from the Like collection using deleteOne, means to dislike
        isLiking = false;
    }else{
        await Like.create({comment: commentId, likedBy: req.user?._id});
        isLiking = true;
    }

    const message = isLiking ? "Add like to comment success" : "Remove like from comment success";
    res.status(200).json(new ApiResponse(
        200,
        {},
        message
    ));

})

const toggleTweetLike = asyncHandler(async (req, res) => {
     //TODO: toggle like on tweet
    const {tweetId} = req.params
    if(!tweetId?.trim() || !isValidObjectId(tweetId)) {
        throw new ApiError(400,'Invalid tweet id, Tweet not found')
    }

    const tweet = await Tweet.findById(tweetId);
    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }
    let isLiking;
    const isLikedAlready = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })
    if(isLikedAlready){
        await Like.deleteOne({tweet: isLikedAlready.tweet, likedBy: isLikedAlready.likedBy})
        isLiking=false;
    }else{
        await Like.create({tweet: tweetId, likedBy: req.user?._id})
        isLiking=true;
    }

    const msg = isLiking?"Add like to tweet success":"Remove like from tweet success";
    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            msg
        )
    )
   
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const videos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
                video: {
                    $exists: true
                }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $project: {
                            title: 1,
                            videoFile: 1,
                            thumbnail: 1,
                            views: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                videos: {
                    $first: "$videos"
                }
            }
        }, 
        {
            $project: {
                videos: 1,
                _id: 0
            }
        },
        {
            $replaceRoot: { newRoot: "$videos" }
        }
    ]);

    res.status(200).json(new ApiResponse(
        200,
        {videos, videosCount: videos.length},
        "Get liked videos success"
    ));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}