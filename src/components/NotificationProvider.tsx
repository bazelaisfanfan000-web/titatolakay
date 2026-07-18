"use client";

import {
 createContext,
 useContext,
 useEffect,
 useState
} from "react";

import {
 onAuthStateChanged
} from "firebase/auth";

import {
 ref,
 onValue
} from "firebase/database";

import {
 auth,
 database
} from "@/lib/firebase";


const NotificationContext =
createContext<any>(null);



export function NotificationProvider({
 children
}:{
 children:React.ReactNode
}){


const [notifications,setNotifications]=useState<any[]>([]);


const [newNotif,setNewNotif]=useState<any>(null);



useEffect(()=>{


let oldCount=0;


const unsub =
onAuthStateChanged(
auth,
(user)=>{


if(!user)return;


const notifRef =
ref(
database,
`notifications/${user.uid}`
);



return onValue(
notifRef,
snap=>{


const data=snap.val();


if(!data){

setNotifications([]);

return;

}



const list =
Object.entries(data)
.map(([id,value]:any)=>({

id,

...value

}))
.sort(
(a,b)=>
b.createdAt-a.createdAt
);



setNotifications(list);



const unread =
list.filter(
n=>!n.read
);



if(
unread.length > oldCount
){

const latest =
unread[0];


setNewNotif(
latest
);


// son
const audio =
new Audio(
"/sounds/notification.mp3"
);

audio.play()
.catch(()=>{});


}



oldCount =
unread.length;


});


});


return ()=>unsub();

},[]);



return (

<NotificationContext.Provider
value={{
notifications,
newNotif,
setNewNotif
}}
>

{children}

</NotificationContext.Provider>


);


}



export function useNotifications(){

return useContext(
NotificationContext
);

}