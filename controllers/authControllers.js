const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config('../.env');
const otpg = require('otp-generator');

const handleErrors = (err) => {
    console.log(err.message, err.code);
    let errors = { email: '', password: '', otp: '' };

    // duplicate error code
    if (err.code === 11000) {
        errors.email = "Email already registered";
    }

    //validation errors
    if (err.message.includes('user validation failed')) {
        Object.values(err.errors).forEach(({ properties }) => {
            errors[properties.path] = properties.message;
        });
    }
    //incorrect OTP
    if (err.message == 'Invalid OTP') {
        errors.otp = 'Invalid OTP';
    }
    //incorrect email
    if (err.message === 'Email Not Registered!!') {
        errors.email = 'Email is Not Registered!!';
    }
    //incorrecct password
    if (err.message === 'Incorrect Password!!') {
        errors.password = 'Incorrect Password!!';
    }
    return errors;
}

const verifyEmail = async (email, otp) => {
    var transporter = nodemailer.createTransport({
        service: "gmail",
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            type: "login",
            user: process.env.MAIL,
            pass: process.env.PASSWORD
        }
    });
    var mailOptions = {
        from: process.env.MAIL,
        to: email,
        subject: "Welcome to Smoothies Store!!",
        //text: "That was pretty easy..!!"
        html: '<h1>Welcome</h1><p>To sign up successfully for the Smoothies Store, Please enter the following OTP: <b>' + otp + '<b></p><br><p>This OTP is valid only for 5 minutes'

    };
    transporter.sendMail(mailOptions, function (err, info) {
        if (err) {
            console.log(err);
        }
        else {
            console.log('Mail Sent!!' + info.response);
        }
    });
}

const maxAge = 3 * 24 * 60 * 60;
const createToken = (id) => {
    return jwt.sign({ id }, 'nodejsapp', {
        expiresIn: maxAge
    });
}

module.exports.signup_get = (req, res) => {
    res.render('signup');
}

module.exports.login_get = (req, res) => {
    res.render('login');
}

module.exports.signup_post = async (req, res) => {
    const { email, password } = req.body;
    try {
        const otp = otpg.generate(6, {
            digits: true,
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false
        });
        const user = await User.create({ email: email, password: password, otp: otp });
        verifyEmail(email, otp);
        res.status(200).json({ message: 'OTP sent' });
    }
    catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
    //console.log(email, password);
    //res.send('new signup');
}

module.exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email: email });

        if (otp == user.otp && otp != 0) {
            const token = createToken(user._id);
            console.log("Hello");
            res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
            res.status(200).json({ user: user._id });
        }
        else {
            throw Error("Invalid OTP");
        }
    }
    catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
};

module.exports.login_post = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.login(email, password);
        const token = createToken(user._id);
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
        res.status(200).json({ user: user._id });
    }
    catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }

    //console.log(email, password);
    //res.send('new login');


}

module.exports.logout_get = (req, res) => {
    res.cookie('jwt', '', { maxAge: 1 });
    res.redirect('/');
}