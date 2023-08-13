"use server"

import { revalidatePath } from "next/cache";
import { connectToDB } from "../mongoose";

import Thread from "../models/thread.model";
import User from "../models/user.model";


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