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
    extented: true,
    limit:"16kb"
}));

app.use(express.static("public")); //images wagera public folder re store kariba like img favicon etc

app.use(cookieParser()); //to perform CRUD operations

export {app};