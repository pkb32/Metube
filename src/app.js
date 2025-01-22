import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({
    limit:"16kb"
}));

app.use(express.urlencoded({ //url ru data asile eeita handle kariba
    extended: true,
    limit:"16kb"
}));

app.use(express.static("public")); //images wagera public folder re store kariba like img favicon etc

app.use(cookieParser()); //to perform CRUD operations

//routes import

import userRouter from "./routes/user.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter); //middlewares

// http://localhost:8000/api/v1/users/register

export {app};