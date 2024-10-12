const mongoose = require("mongoose")


const notesSchema = new mongoose.Schema({
    title: {
      type: String,
      required: [true, 'title is required'],
      minlength: [3, 'Username must be at least 3 characters long'],
    },
    content: {
      type: String,
    },
    tags: {
      type: String,
      minlength: [3, 'tags must be at least 3 characters long'],
    },
    userId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "user"
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });

  const Notes = mongoose.model("notes",notesSchema)
  module.exports = Notes