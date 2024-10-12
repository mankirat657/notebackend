// server.js
const express = require('express');
const app = express();
const connectDb = require('./connection/connect'); 
const User = require("./model/user"); 
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
const Notes = require("./model/notes")
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage : storage })
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.post('/createUser', async (req, res) => {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: "User Already Registered" });

    bcrypt.genSalt(10, (err, salt) => {
        if (err) return res.status(500).json({ error: "Error generating salt" });

        bcrypt.hash(password, salt, async (err, hash) => {
            if (err) return res.status(500).json({ error: "Error hashing password" });

            try {
                let newUser = await User.create({
                    name,
                    email,
                    password: hash,
                });

                let token = jwt.sign({ email, userid: newUser._id, name  : newUser.name},"sjjjjjjjjjjjj"); 
                res.cookie("token", token, { httpOnly: true, secure: false });

                return res.status(201).json({ message: "User created successfully!" });
            } catch (error) {
                console.error("Error creating user:", error);
                return res.status(500).json({ error: "Error creating user" });
            }
        });
    });
});

app.post('/loginuser', async (req, res) => {
    let { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    bcrypt.compare(password, user.password, (err, result) => {
        if (err) return res.status(500).json({ error: "Error comparing password" });

        if (result) {
            let token = jwt.sign({ email, userid: user._id }, process.env.JWT_SECRET || "sjjjjjjjjjjjj");
            res.cookie("token", token, { httpOnly: true, secure: false });
            return res.status(200).json({ 
                message: "Login successful", 
                token, 
                user: { name: user.name, email: user.email }  
            });
        } else {
            return res.status(401).json({ error: "Invalid credentials" });
        }
    });
});
app.post('/logout' , async(req,res)=>{
    res.clearCookie("token");
    return res.status(200).json({ msg: "User logged out successfully" });
}) 
const verifyToken = (req,res,next) =>{
    const token = req.cookies.token;
    if(!token) return res.status(401).json({error: "No token provided"})

    jwt.verify(token, process.env.JWT_SECRET || "sjjjjjjjjjjjj",(err,decoded)=>{
        if(err) return res.status(403).json({error : "failded to authenticate token"})
        req.userid = decoded.userid;
        next()  
    })
}
app.post('/createNotes',verifyToken, async(req,res)=>{
    const {title,content,tags} = req.body;
    console.log(title,content,tags);
    
    if(!title || !content) {
        return res.status(400).json({error : "Title and Content are required"})
    }
    try {
        const newNote = await Notes.create({
            title,
            content,
            tags,
            userId : req.userid
        })
        return res.status(200).json({message : "Note created Successfully",note: newNote})
    } catch (error) {
        console.error("error creating notes",error)
        return res.status(500).json({error : "Error creating note"})
    }

})
app.get('/notes', verifyToken, async(req,res) =>{
        try {
            const notes = await Notes.find({userId : req.userid})
            return res.status(200).json(notes)
        } catch (error) {
            console.error("Error fetching notes",error);
            return res.status(500).json("Error fetching the notes")
            
        }
})
app.post('/updateNotes', verifyToken, async (req, res) => {
    const { newTitle, newContent, newTags, prevTitle } = req.body;

    if (!prevTitle) {
        return res.status(400).json({ error: "Previous Title is required." });
    }

    const updateFields = {};
    if (newTitle) updateFields.title = newTitle;
    if (newContent) updateFields.content = newContent;
    if (newTags) updateFields.tags = newTags;

    try {
        const updatedNote = await Notes.findOneAndUpdate(
            { title: prevTitle, userId: req.userid }, 
            updateFields,  
            { new: true } 
        );

        if (!updatedNote) {
            return res.status(404).json({ error: "Note not found" });
        }

        return res.status(200).json({ message: "Note updated successfully", note: updatedNote });

    } catch (error) {
        console.error("Error updating note:", error);
        return res.status(500).json({ error: "Error updating note" });
    }
});

app.post('/deleteNotes', verifyToken, async (req, res) => {
    const { prevTitle } = req.body;
    
    if (!prevTitle) { 
        return res.status(400).json({ message: "Title is required to delete a note." });
    }
    try {
        const deletedNotes = await Notes.findOneAndDelete({
            title: prevTitle,
            userId: req.userid
        });

        if (!deletedNotes) {
            return res.status(404).json({ error: "Note not found or not deleted." });
        }

        return res.status(200).json({ message: "Note deleted successfully." });

    } catch (error) {
        console.error('Error deleting the note:', error);
        return res.status(500).json({ message: "Server error. Please try again later." });
    }
});
app.post('/upload', verifyToken, upload.single('profilePic'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.userid, 
            { 
                profilePic: req.file.buffer,
                contentType: req.file.mimetype 
            }, 
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ message: "Profile picture uploaded successfully" });
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        res.status(500).send("Error uploading profile picture: " + error.message);
    }
});
app.get('/profilePic', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userid);

        if (!user || !user.profilePic) {
            return res.status(404).send("Profile picture not found");
        }

        res.set('Content-Type', user.contentType);
        res.send(user.profilePic);
    } catch (error) {
        console.error("Error retrieving profile picture:", error);
        res.status(500).send("Error retrieving profile picture");
    }
});

app.listen(3000, () => {
    console.log("Server started successfully on port 3000");
    connectDb();
});
