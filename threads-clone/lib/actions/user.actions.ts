"use server"

import { revalidatePath } from "next/cache";
import User from "../models/user.model";
import { connectToDB } from "../mongoose"

interface Params {
   userId: string,
   username: string,
   name: string,
   bio: string,
   image: string,
   path: string,
}

export async function updateUser({   
   userId,
   username,
   name,
   bio,
   image,
   path,
} : Params): Promise<void> {

   connectToDB();

   try {
      await User.findOneAndUpdate(
         { id: userId }, 
         {
            username: username.toLowerCase(),
            name,
            bio,
            image,
            onboarded: true,
         },
         { upsert: true}
      );
   
      // if updating profile, revalidate it
      if(path === '/profile/edit') {
         // revalidatePath allows to revalidate data associated with a specific
         // path. This is useful for scenarios where you want to update your 
         // cached data without waiting for a revalidation period to expire.
         revalidatePath(path);
      }
   } catch (error: any) {
      throw new Error(`Failed to create/update user: ${error.message}`)
   }
}