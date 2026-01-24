var express = require('express');
var router = express.Router();

const { asyncHandler } = require('../../utils/index');
const { authAdmin } = require('../../middlewares/checkAuth');


const CustomersController = require('../../controllers/api/admin/customers.controller');

router.patch('/toggle/:id', authAdmin, CustomersController.toggleStatus);

module.exports = router;
