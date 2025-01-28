import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
    // Build a healthcheck response
    res
    .status(200)
    .json(
        new ApiResponse(
            200,
            null,
            "OK - The server is running and healthy"
        )
    );
});

export { healthcheck };
