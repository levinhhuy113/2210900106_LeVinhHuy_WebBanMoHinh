const menuConfig = require("../config/adminMenu");

const asyncHandler = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

const setActivePage = function (req, res, next) {
    const cleanPath = req.originalUrl.split("?")[0];
    const match = cleanPath.match(/^\/admin\/([^\/]+)/);

    res.locals.activePage = match ? match[1] : "dashboard"; 

    res.locals.adminMenu = menuConfig;
    next();
}

module.exports = {
    asyncHandler,
    setActivePage
};

