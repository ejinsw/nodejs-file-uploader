var express = require('express');
var router = express.Router();

const controller = require('../controllers/controller')

/* GET home page. */
router.get('/', controller.getIndex);
router.post('/file-upload', controller.postUpload);
router.post('/create-folder', controller.postCreateFolder)
router.get('/file-delete', controller.getDelete)

router.get('/login', controller.getLogin)

router.post('/login', controller.postLogin)

router.get('/register', controller.getRegister)

router.post('/register', controller.postRegister)

router.get('/sign-out', controller.getSignOut)


module.exports = router;
