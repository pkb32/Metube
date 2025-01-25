import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
//import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    //req.body is used to access key-value pairs of data sent in the body of the HTTP request
    //req.files is used to access uploaded files
    /*application/json → Use req.body.
        multipart/form-data → Use req.files. */
    const content = req.body?.content?.trim();
    if(!content) {
        throw new ApiError(400, "Content is required");
    }

    let tweet = await Tweet.create({
        content: content.trim(),
        owner: req.user._id
    })
    if(!tweet) {
        throw new ApiError(500, "Failed to create tweet")
    }

    /*When creating the document (Tweet.create), only the reference to the owner (req.user._id) is stored in the Tweet document. This is typically just the _id of the user, not the full user data.

Populating the owner: The populate method replaces the owner field (which is currently just the user's _id) with the corresponding user object, including the fields you specify (fullname, username, and avatar). */
    tweet = await Tweet.findById(tweet._id).populate("owner", "fullname username avatar");

    res
    .status(201)
    .json(
        new ApiResponse(
            201, 
            tweet,
            "Tweet created successfully"
           
        )
    )

})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    let {page =1, limit = 10, userId} = req.params;
    if(!userId?.trim() || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    page = isNaN(page) ? 1 : Number(page);
    limit = isNaN(limit) ? 10 : Number(limit);
    if(page<=0)
    {
        page =1;
    }
    if(limit <=0){
        page = 10;
    }

    const tweets = await Tweet.aggregate([
        {
            $match: { //Filters the tweets to include only those where the owner matches the given userId.
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: { //Performs a join-like operation between the Tweet and User collections:
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: { //Limits the fields to only fullname, username, and avatar.
                            username: 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields:{ /*Since the $lookup stage creates an array for the owner field (even if there's only one match), this stage simplifies it by taking the first element of the owner array.
                Now, owner will be a single object containing fullname, username, and avatar. */
                owner: {
                    $first: "$owner"
                }
            }
        },
        { 
            $sort: { //Sorts the tweets in descending order based on the createdAt field (newest tweets first).
                createdAt: -1
            }
        },
        {
            $skip: (page - 1) * limit
        },
        {
            $limit: limit
        }
    ]);


    res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            tweets,
            "Get user tweets success"
           
        )
    )



})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params;

    if(!tweetId.trim() || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id to update the tweet");
    }

    let content = req.body?.content?.trim();
    if(!content) {
        throw new ApiError(400, "Content is required to update the tweet");

    }

    let tweet = await Tweet.findById(tweetId);

    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    tweet = await Tweet.findByIdAndUpdate(tweetId, {
        $set: {
            content: content
        }
    }, {
        new: true
    });

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            tweet,
            "Tweet updated successfully"
        )
    )

});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params;
    if(!tweetId.trim() || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet id to delete the tweet");
    }
    let tweet = await Tweet.findById(tweetId);
    if(!tweet) {
        throw new ApiError(404, "Tweet not found");
    }
    /*tweet = await Tweet.findById(tweetId);
    console.log(tweet.owner); // Outputs: ObjectId("64a123b456cdef789d012345"), it directly stores the _id */
    if(tweet.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(403, "You are not authorized to delete this tweet, only owner can delete this tweet");
    }
    await Tweet.findByIdAndDelete(tweetId);

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Tweet deleted successfully"
        )
    )

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}