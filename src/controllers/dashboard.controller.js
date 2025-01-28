import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const data = await Video.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
                
            }
        },
        {
            $addFields:{
                likes:{
                    $size: "$likes"
                }
            }
        },
        {
            $group:{
                _id: null,
                totalViews:{
                    $sum: "$views"
                },
                totalLikes: {
                    $sum: "$likes"
                },
                totalVideos: {
                    $sum: 1
                }
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField:"owner",
                foreignField: "channel",
                as: "totalsubscribers"
            }
        },
        {
            $addFields:{
                totalSubscribers:{
                    $size: "$totalsubscribers"
                }
            }
        },
        {
            $project:{
                _id: 0,
                owner: 0
            }
        }
    ]);

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            data,
            "Get channel stats success"
        )
    )

})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    let {page =1, limit = 10, sortBy, sortType} = req.query
    page = isNaN(page) ? 1 : Number(page);
    limit = isNaN(limit) ? 10 : Number(limit);
    if(page <=0){
        page =1;
    }
    if(limit <=0){
        page = 10;
    }

    const sortStage={};
    if(sortBy && sortType){
        sortStage["$sort"] = {
            [sortBy]: sortType === "asc" ? 1 : -1
        }
    }else{
        sortStage["$sort"] = {
            createdAt: -1
        }
    }


    const videos = await Video.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        sortStage,
        {
            $project:{
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                views: 1,
                duration: 1
            }
        },
        { $skip: (page - 1) * limit},
        { $limit: limit }
    ]);

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "Get channel videos success"
        )
    );
});

export {
    getChannelStats, 
    getChannelVideos
}