//require ('dotenv').config({path: './env'});

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import {app} from './app.js'

dotenv.config({
    path: './env'
})

connectDB() //eeita gote promise return kariba
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MongoDB connection error !!!",err);
});





































/* to directly connect the DB in the index.js file


import express from "express";
const app = express();

//IIFE
(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        app.on("error",(error)=>{
            console.log("Err:",error);
            throw error;
        })

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });

    } catch (error) {
        console.log(error);
        throw error;
    }
})();*/