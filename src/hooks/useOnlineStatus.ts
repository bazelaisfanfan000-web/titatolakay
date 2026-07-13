"use client";

import {
  useEffect
} from "react";

import {
  ref,
  onDisconnect,
  update,
  serverTimestamp
} from "firebase/database";

import {
  onAuthStateChanged
} from "firebase/auth";

import {
  auth,
  database
} from "@/lib/firebase";


export function useOnlineStatus(){


useEffect(()=>{


const unsubscribe =
onAuthStateChanged(
auth,
(user)=>{


if(!user) return;



const userStatusRef =
ref(
database,
`users/${user.uid}`
);



update(
userStatusRef,
{

online:true,

lastSeen:
serverTimestamp()

}
);



onDisconnect(
userStatusRef
)
.update({

online:false,

lastSeen:
serverTimestamp()

});



}

);



return ()=>unsubscribe();



},[]);



}