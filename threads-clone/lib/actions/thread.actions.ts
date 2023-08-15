"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";

import Thread from "../models/thread.model";
import User from "../models/user.model";
import { Children } from "react";


interface Params {
   text: string,
   author: string,
   communityId: string | null,
   path: string
}

export async function createThread({
   text, 
   author, 
   communityId, 
   path
}: Params) {

   try {
      connectToDB();
   
      const createdThread = await Thread.create({
         text,
         author,
         community: null,
      });
   
      // update user model
      await User.findByIdAndUpdate(author, {
         // push to specific user who created the thread
         $push: { threads: createdThread._id }
      })
   
      revalidatePath(path);
      
   } catch (error: any) {
      throw new Error(`Error creating thread: ${error.message}`)
   }
}

export async function fetchThreads(pageNumber = 1, pageSize = 20) {
   connectToDB();

   // Calculate the number of posts to skip
   const skipAmount = (pageNumber - 1) * pageSize

   // Fetch the posts that have no parents (top-level threads, a thread that is not a comment/reply)
   const postsQuery = Thread.find({ parentId: { $in: [null, undefined]}})
      .sort({ createdAt: 'desc'})
      .skip(skipAmount)
      .limit(pageSize)
      .populate({ 
         path: 'author', 
         model: User 
      })
      .populate({ 
         path: 'children',
         populate: {
            path: 'author', // populate the author field within children
            model: User,
            select: "_id name parentId image"
         }
      })

   const totalPostsCount = await Thread.countDocuments({
         parentId: { $in: [null, undefined] }
      });

   const posts = await postsQuery.exec();

   const isNext = totalPostsCount > skipAmount + posts.length;

   return { posts, isNext };
}

export async function fetchThreadById(id: string) {
   connectToDB();

   try {
      const thread = await Thread.findById(id)
         .populate({
            path: 'author',
            model: User,
            select: "_id id name image"
         })
         .populate({
            path: 'children',
            populate: [
               {
                  path: 'author',
                  model: User,
                  select: "_id id name parentId image"
               },
               {
                  path: 'children',
                  model: Thread,
                  populate: {
                     path: 'author',
                     model: User,
                     select: "_id id name parentId image"
                  }
               }
            ]
         }).exec();

         return thread;
   } catch (error: any) {
      throw new Error(`Error fetching thread: ${error.message}`)
   }
}

export async function addCommentToThread(
   threadId: string,
   commentText: string,
   userId: string,
   path: string
) {
   connectToDB();

   try {
      // Find the original thread by its ID
      const originalThread = await Thread.findById(threadId);

      if(!originalThread) {
         throw new Error("Thread not found");
      }

      // Create a new thread with the comment text
      const commentThread = new Thread({
         text: commentText,
         author: userId,
         parentId: threadId
      })

      // Save the comment thread to the database
      const savedCommentThread = await commentThread.save();

      // Add the comment thread's ID to the original thread's children array
      originalThread.children.push(savedCommentThread._id);

      // Save the updated original thread to the database
      await originalThread.save();

      revalidatePath(path);
   } catch (error: any) {
      console.error("Error while adding comment:", error)
      throw new Error(`Error adding comment to thread: ${error.message}`);
   }
}

export async function fetchUserPosts(userId: string) {
 try {
   connectToDB();

   // Find all threads authored by user with the given userId

   // TODO: Populate community
   const threads = await Thread.findOne({id: userId})
      .populate({
         path: 'threads',
         model: Thread,
         populate: {
            path: 'children',
            model: Thread,
            populate: {
               path: 'author',
               model: User,
               select: 'name image id'
            }
         }
      })

      return threads;
 } catch (error: any) {
   // throw new Error(`Error fetching user posts: ${error.message}`)
 }
}