const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const postSchema = new Schema({
  title: String,
  author: String,
  content: String,
  password: mongoose.Schema.Types.Mixed,
  date: String,
  count: {
    type: Number,
    default: 0
  },
  countComment: {
    type: Number,
    default: 0
  },
  comments: [mongoose.Schema.Types.Mixed],
});

export default mongoose.model('Post', postSchema);
