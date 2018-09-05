const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const commentSchema = new Schema({
    PostID: String,
    text: String,
    date: String,
    password: mongoose.Schema.Types.Mixed
});

export default mongoose.model('Comment', commentSchema);