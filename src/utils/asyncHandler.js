//higher order function
/*
const xyz = () => { async () => {} } ame directly gote func as a parameter eei function re pass karilu and seita ame au gote jaga ku deidelu au gote arrow function re
*/ 
/*const asyncHandler = (fn) => async (req, res, next) => {
    try {

        await fn(req, res, next);
        
    } catch (error) {
        res.status(error.code || 500).json({ //sir eeithi err lekhichanti
            success: false,
            message: error.message
        })    
    }
    
} eeita gote way ame au gote kariba*/

const asyncHandler = (requestHandler) =>{
    (req,res,next) => {
        Promise.resolve(requestHandler(req, res, next)).
        catch((err) => next(err))
    }
}

 export {asyncHandler}
//export default asyncHandler