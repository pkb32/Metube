import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    const {name, description} = req.body
    if(!name.trim() || !description.trim()) {
        throw new ApiError(400, "Invalid request! Name and description are required");
    }

    const playlist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        owner: req.user._id
    });

    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist,
            "Playlist created successfully"
        )
    )

})

const getUserPlaylists = asyncHandler(async (req, res) => {
     //TODO: get user playlists
    const {userId} = req.params
    if(!userId?.trim() || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid request! User ID is required");
    }

    const playlists = await Playlist.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId.trim())
            }
        },
        {
            $sort:{
                createdAt: -1
            }
        },
        {
            $project:{
                name:1,
                description:1,
            }
        }
    ]);

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlists,
            "Get user playlists success"
        )
    )
   
})

const getPlaylistById = asyncHandler(async (req, res) => {
    //TODO: get playlist by id
    const {playlistId} = req.params
    if(!playlistId?.trim() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid request! Playlist ID is required");
    }

    let playlist = await Playlist.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(playlistId.trim())
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "videoOwner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullname: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            VideoOwner: {
                                $first: "$videoOwner"
                            }
                        }
                    },
                    {
                        $project: {
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            views:1,
                            videoOwner: 1,
                        }
                    }
                    
                ]
            }
        },
        {
            $lookup:{
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
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        }
    ]);
 /* structure of playlist
 [
    {
        _id: "playlistId",  // ID of the playlist
        name: "Playlist Name", // (Assuming your Playlist schema includes this field)
        description: "Playlist description", // (Assuming this exists)
        owner: {
            _id: "ownerId",  // ID of the playlist owner
            username: "ownerUsername",
            fullname: "ownerFullname",
            avatar: "ownerAvatarUrl"
        },
        videos: [
            {
                _id: "videoId",  // ID of the video
                title: "Video Title",
                thumbnail: "thumbnailUrl",  // Video thumbnail
                description: "Video description",
                views: 12345,  // Number of views
                videoOwner: {
                    _id: "videoOwnerId",  // ID of the video's owner
                    username: "videoOwnerUsername",
                    fullname: "videoOwnerFullname"
                }
            },
            // More video objects if the playlist has multiple videos
        ]
    }
]

  */
    if(playlist.lenght > 0){
        playlist = playlist[0];
    } else{
        throw new ApiError(404, "Playlist not found");
    }

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist,
            "Get single playlist success"
        )
    )

});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!playlistId?.trim() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    if(!videoId?.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId.trim());
    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    const playlist = await Playlist.findById(playlistId.trim());
    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if(playlist.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(403, "You are not authorized to add video to this playlist! only the owner of the playlist can add the videos to their playlist");
    }

    /*If playlist.videos contains ObjectIds and video._id is an ObjectId, this method works because ObjectId objects are compared by reference.
If playlist.videos contains strings (or mixed types), this will fail unless the types and values match exactly. 
    const isExist = playlist.videos.includes(video._id);*/

    const isExist = playlist.videos.findIndex(v => v.toString() === video._id?.toString());
    if(isExist !== -1) {
        throw new ApiError(400, "Video already exists in the playlist");
    }

    playlist.videos.push(video._id);

    await playlist.save();

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video added to playlist successfully"
        )
    )

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist

    const {playlistId, videoId} = req.params
    if(!playlistId?.trim() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }

    if(!videoId?.trim() || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    
    const playlist = await Playlist.findById(playlistId.trim());
    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if(playlist.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(403, "You are not authorized to remove video from this playlist! only the owner of the playlist can remove the videos from their playlist");
    }

    let isExist = playlist.videos.findIndex(v => v.toString() === videoId.trim());
    if(isExist === -1) {
        throw new ApiError(400, "Video not found in the playlist");
    }

    //filter() creates a new array that contains all videos except the one whose ID matches videoId.
    playlist.videos = playlist.videos.filter(v => v.toString() !== videoId.trim());
    await playlist.save();

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video removed from playlist successfully"
        )
    )

})

const deletePlaylist = asyncHandler(async (req, res) => {
     // TODO: delete playlist
    const {playlistId} = req.params
    if(!playlistId?.trim() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }
    
    let playlist = await Playlist.findById(playlistId.trim());
    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if(playlist.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(403, "You are not authorized to delete this playlist! only the owner of the playlist can delete the playlist");
    }

    await Playlist.findByIdAndDelete(playlist._id); // playlistId.trim()
    res 
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Playlist deleted successfully"
        )
    )
   
})

const updatePlaylist = asyncHandler(async (req, res) => {
    //TODO: update playlist
    const {playlistId} = req.params
    const {name, description} = req.body
    if(!playlistId?.trim() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
    }
    let playlist = await Playlist.findById(playlistId.trim());
    if(!playlist) {
        throw new ApiError(404, "Playlist not found to update");
    }

    if(playlist.owner?.toString() !== req.user?._id?.toString()) {
        throw new ApiError(403, "You are not authorized to update this playlist! only the owner of the playlist can update the playlist");
    }    

    const fieldsToUpdate = {};
    if(name?.trim()) {
        fieldsToUpdate["name"] = name.trim();
    }
    if(description?.trim()) {
        fieldsToUpdate["description"] = description.trim();
    }
        /*if(Object.keys(fieldsToUpdate).length > 0) {
            playlist = await Playlist.findByIdAndUpdate(playlistId.trim(), fieldsToUpdate, {new: true});
        }*/

        playlist = await Playlist.findByIdAndUpdate(playlist._id,{ // playlistId.trim() can also be used
            $set: {...fieldsToUpdate}
        }, {
            new: true,
    });

    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            playlist,
            "Playlist updated successfully"
        )
    )


})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}