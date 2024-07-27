const asyncHandler = require('express-async-handler')
const bcrypt = require('bcryptjs')
const passport = require('../config/passport')
const prisma = require('../config/client')
const multer = require('multer')
const path = require('path');

const uploadDir = path.join(__dirname, 'uploads');

const fs = require('fs');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Store in 'uploads' directory
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Use a unique filename
    }
});

const upload = multer({ storage: storage })


exports.getIndex = asyncHandler(async (req, res, next) => {
    const username = req.isAuthenticated() ? req.user.username : ""

    if (!req.isAuthenticated()) {
        res.redirect('/login')
    } else {
        res.render('layout', { title: 'Home', user: req.user, content: 'index', username: username })
    }

})

exports.postUpload = [upload.single('file'), asyncHandler(async (req, res, next) => {
    res.redirect('/')
})]

exports.getLogin = asyncHandler(async (req, res, next) => {
    res.render('layout', { title: 'Login', user: req.user, content: 'login', error: req.flash('error'), formData: { username: req.flash('username'), password: "" } })
    req.session.messages = [];
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
    res.render('layout', { title: 'Register', user: req.user, content: 'register', error: false, formData: { username: "", password: "" } })
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
                user: req.user,
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
                username: username,
                email: username,
                password: hashedPassword,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        // Authenticate the user
        passport.authenticate('local')(req, res, next);
    } catch (error) {
        console.error(error);
        res.status(500).render('register', {
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