const jwt = require('jsonwebtoken');

// This function will be used to protect routes that require a user to be logged in.
module.exports = function (req, res, next) {
    // Get the token from the request header
    const token = req.header('x-auth-token');

    // Check if no token is provided
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify the token
    try {
        // Decode the token to get the user's info (id, role)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Add the user info to the request object so our routes can access it
        req.user = decoded.user;
        
        // Move to the next function in the API route
        next();
    } catch (err) {
        
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
