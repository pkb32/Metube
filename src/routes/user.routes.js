import { Router } from "express";
import {upload} from "../middlewares/multer.middlerware.js";
import { registerUser } from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(
    //middle wares
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },

        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

export default router;