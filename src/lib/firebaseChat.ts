import {
  ref,
  push,
  set,
  serverTimestamp
} from "firebase/database";

import {
  rtdb
} from "@/lib/firebase";



export async function sendMessage(

roomId:string,

uid:string,

name:string,

text:string

){


if(!text.trim()) return;



const chatRef = push(

ref(
rtdb,
`rooms/${roomId}/chat`
)

);



await set(

chatRef,

{

uid,

name,

text,

time:serverTimestamp()

}

);


}