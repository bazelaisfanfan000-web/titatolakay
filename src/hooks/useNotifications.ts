"use client";


import {
  useEffect,
  useState
} from "react";


import {
  ref,
  onValue
} from "firebase/database";


import {
  auth,
  database
} from "@/lib/firebase";




export function useNotifications(){


const [notifications,setNotifications] =
useState<any[]>([]);



useEffect(()=>{


const user =
auth.currentUser;



if(!user)
return;



const notifRef =
ref(
database,
`notifications/${user.uid}`
);



const unsubscribe =
onValue(

notifRef,

(snapshot)=>{


const data =
snapshot.val();



if(!data){

setNotifications([]);

return;

}




const list =
Object.entries(data)
.map(
([id,value]:any)=>({

id,

...value

})
);



setNotifications(list);



}

);



return ()=>unsubscribe();



},[]);





return {

notifications,

count:
notifications.filter(
(n)=>!n.read
).length

};



}