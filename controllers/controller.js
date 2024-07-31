const asyncHandler = require('express-async-handler')
const bcrypt = require('bcryptjs')
const passport = require('../config/passport')
const prisma = require('../config/client')
const multer = require('multer')
const path = require('path');
const fileTreeController = require('./fileTreeController')

let uploadDir = path.join(__dirname, 'root');

const fs = require('fs');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        uploadDir = req.body.path;
        console.log(uploadDir)
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage })


exports.getIndex = asyncHandler(async (req, res, next) => {
    const username = req.isAuthenticated() ? req.user.username : ""

    const uploadsPath = path.join(__dirname, 'root');

    const uploadsNode = new fileTreeController.TreeNode(uploadsPath, true, __dirname, [])

    await fileTreeController.getPaths(uploadsPath, uploadsNode)

    if (!req.isAuthenticated()) {
        res.redirect('/login')
    } else {
        res.render('layout', { title: 'Home', user: req.user, content: 'index', username: username, rootNode: uploadsNode, path: path })
    }

})

exports.postCreateFolder = asyncHandler(async (req, res, next) => {
    const directory = req.body.path;
    const folderName = req.body.filename;
    const newFolderPath = path.join(directory, folderName);

    // Create the new folder
    fs.mkdir(newFolderPath, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating folder:', err);
            return res.status(500).json({ success: false, message: 'Error creating folder' });
        }
    });

    res.redirect('/')
});

exports.getDelete = asyncHandler(async (req, res, next) => {
    const { path: filePath, isDirectory } = req.query;

    try {
        if (isDirectory === 'true') {
            fs.rmSync(filePath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(filePath);
        }
        res.redirect('/');
    } catch (err) {
        console.error(`Error deleting ${isDirectory ? 'folder' : 'file'}:`, err);
        res.status(500).send('Error deleting file or folder');
    }
});

exports.postUpload = [upload.single('file'), asyncHandler(async (req, res, next) => {
    res.redirect('/')
})]

exports.getLogin = asyncHandler(async (req, res, next) => {
    if (req.isAuthenticated()) {
        res.redirect('/')
    } else {
        res.render('layout', { title: 'Login', user: req.user, content: 'login', error: req.flash('error'), formData: { username: req.flash('username'), password: "" } })
        req.session.messages = [];
    }
})

exports.postLogin = asyncHandler(async (req, res, next) => {
    await passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err); // Handle any errors that occurred during authentication
        }
        if (!user) {
            // Flash the error message and username if authentication failed
            req.flash('error', info ? info.message : 'Authentication failed.');
            req.flash('username', req.body.username); // Store the username from the request
            return res.redirect('/login'); // Redirect back to the login page
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            return res.redirect('/'); // Redirect to the home page or another page
        });
    }
    )(req, res, next);
})

exports.getRegister = asyncHandler(async (req, res, next) => {
    if (req.isAuthenticated()) {
        res.redirect('/')
    } else {
        res.render('layout', { title: 'Register', user: req.user, content: 'register', error: false, formData: { username: "", password: "" } })
    }
})

exports.postRegister = asyncHandler(async (req, res, next) => {
    try {
        const { username, password } = req.body;

        // Check if the user already exists
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser) {
            return res.status(400).render('layout', {
                title: 'Register',
                content: 'register',
                error: 'Username already exists. Please choose another one.',
                formData: req.body,
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the new user
        await prisma.user.create({
            data: {
                username,
                email: username,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        // Authenticate the user
        await passport.authenticate('local', {
            successRedirect: "/",
            failureRedirect: "/register"
        })(req, res, next);

    } catch (error) {
        console.error(error);
        res.status(500).render('layout', {
            title: 'Register',
            content: 'register',
            error: 'An error occurred during registration. Please try again.',
            formData: req.body,
        });
    }
})

exports.getSignOut = asyncHandler(async (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
})