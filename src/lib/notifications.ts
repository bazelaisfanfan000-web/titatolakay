import {
  ref,
  push,
  set,
  serverTimestamp
} from "firebase/database";

import {
  database
} from "@/lib/firebase";



export async function sendNotification(
  receiverId:string,
  data:any
){


const notificationRef =
push(
  ref(
    database,
    `notifications/${receiverId}`
  )
);



await set(
  notificationRef,
  {

    ...data,

    createdAt:
    serverTimestamp(),

    read:false

  }
);


}