const { GraphQLServer } = require('graphql-yoga');
const { Prisma } = require('prisma-binding');
import mongoose from 'mongoose';
import Post from "./Post";
import Comment from "./Comment";
import { ObjectId } from "mongodb";
import crypto from 'crypto';

// Connect mongoDB
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://ID:PW@ds229771.mlab.com:29771/mydb', {useNewUrlParser : true});
mongoose.connection.once('open', () => {
    console.log('MongoDB Connected...');
});

// Define resolvers
const resolvers = {
  Query: {
    post: async (_, { _id }) => {
      return await Post.findOne({_id});
    },
    posts: async () => {
      return await Post.find().sort({'date': 1});
    },
    comments: async (_, {PostID}) => {
      return await Comment.find({PostID: PostID}).sort({'date': 1});
    },
    search: async (_, { type, value }) => {
      if(type === 'title')       
        return await Post.find({ title: {"$regex": value, "$options": "i"}}).sort({'date': 1});
      else if(type === 'content')
        return await Post.find({ content: {"$regex": value, "$options": "i"}}).sort({'date': 1});
      else if(type === 'titleContent')
        return await Post.find({ 
          title: {"$regex": value, "$options": "i"},
          content: {"$regex": value, "$options": "i"}}).sort({ date: 1 });
      else if(type === 'author')
        return await Post.find({ author: {"$regex": value, "$options": "i"}}).sort({ date: 1 });
    },
  },
  
  Mutation: {
    createPost: async (_, { title, author, content, password, date }) => {
      const post = new Post({
        title,
        author,
        content,
        date,
        password,
        count: 0,
        countComment: 0
      });

      return post.save();
    },

    deletePost: async (_, { _id, password }) => {

      const tmp = await Post.findOne({_id});

      if(tmp === null)
      {
        return false;
      }

      const salt = tmp.password.salt;
      const iter = tmp.password.iter;
      const hash = crypto.pbkdf2Sync(password, salt, iter, 64, 'sha512').toString('base64');

      const pw = {
        hash,
        salt,
        iter
      };
      
      const post = await Post.findOneAndRemove({ _id, password: pw});    
      
      if(post !== null)
      {
        await Comment.remove({PostID: _id});
        return true;
      }
      else
        return false;
    }, 
       
    updatePost: async (_, { _id, title, content }) => {

      const post = await Post.findOneAndUpdate({ _id}, {title, content});

      if(post !== null)
      {
        return true;
      }
      else
        return false;
    },

    countPost: async (_, { _id }) => {
      const post = await Post.findOne({ _id}, function(err, data){
        if(err) throw err;
        data.count += 1;
        data.save();
      });

      if(post !== null)
        return true;
      else
        return false;
    },

    createComment: async (_, { PostID, text, date, password }) => {

      const comment = new Comment({
        PostID,
        text,
        date,
        password
      });

      const post = await Post.findOne({_id: PostID}, function(err, data){
        if(err) throw err;
        data.countComment += 1;
        data.comments.push(comment);
        data.save();
      });

      return comment.save();
    },

    deleteComment: async (_, { _id, password, PostID }) => {

      const tmp = await Comment.findOne({_id});

      if(tmp === null)
      {
        return false;
      }

      const salt = tmp.password.salt;
      const iter = tmp.password.iter;
      const hash = crypto.pbkdf2Sync(password, salt, iter, 64, 'sha512').toString('base64');

      const pw = {
        hash,
        salt,
        iter
      };

      const comment = await Comment.findOneAndRemove({ _id, password: pw });

      if(comment !== null)
      {
        const post = await Post.findOne({_id: PostID}, function(err, data){
          if(err) throw err;
          data.countComment -= 1;
          data.comments.splice(data.comments.findIndex((comment) => {
            return (comment._id == _id);
          }), 1);
          data.save();
        });
        return true;
      }
      else
        return false;
    },

    checkPassword:  async (_, { _id, password }) => {
      const tmp = await Post.findOne({_id});

      if(tmp === null)
      {
        return false;
      }

      const salt = tmp.password.salt;
      const iter = tmp.password.iter;
      const hash = crypto.pbkdf2Sync(password, salt, iter, 64, 'sha512').toString('base64');

      const pw = {
        hash,
        salt,
        iter
      };
      
      const post = await Post.findOne({_id, password: pw});

      if(post !== null)
        return true;
      else
        return false;
    },
  }
}

const server = new GraphQLServer({
  typeDefs: './src/schema.graphql',
  resolvers,
  context: req => ({
    ...req,
    db: new Prisma({
      typeDefs: 'src/generated/prisma.graphql',
      endpoint: 'https://us1.prisma.sh/public-prongrazor-882/boardql/dev',
      debug: true,
    }),
  }),
})

server.start(() => console.log('Server is running on http://localhost:4000'))
