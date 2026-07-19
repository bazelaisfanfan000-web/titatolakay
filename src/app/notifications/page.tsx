"use client";

import {
  useEffect,
  useState
} from "react";

import Link from "next/link";

import {
  usePathname
} from "next/navigation";

import {
  Home,
  Gamepad2,
  Wallet,
  User,
  Bell
} from "lucide-react";

import {
  onAuthStateChanged
} from "firebase/auth";

import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";

import {
  auth,
  firestore
} from "@/lib/firebase";



export default function BottomNav(){


  const pathname =
  usePathname();


  const [userId,setUserId] =
  useState<string>("");


  const [count,setCount] =
  useState(0);





  useEffect(()=>{


    const unsubAuth =

    onAuthStateChanged(
      auth,
      (user)=>{


        if(!user){

          setUserId("");

          return;

        }


        setUserId(
          user.uid
        );



      }

    );



    return ()=>unsubAuth();



  },[]);







  useEffect(()=>{


    if(!userId)
    return;



    const notificationsRef =

    collection(

      firestore,

      "notifications",

      userId,

      "items"

    );



    const q =

    query(

      notificationsRef,

      where(
        "read",
        "==",
        false
      )

    );



    const unsub =

    onSnapshot(

      q,

      (snapshot)=>{


        setCount(
          snapshot.size
        );


      }

    );



    return ()=>unsub();



  },[userId]);







  const links = [

    {

      name:"Accueil",

      href:"/dashboard",

      icon:Home

    },


    {

      name:"Jeu",

      href:"/create-room",

      icon:Gamepad2

    },


    {

      name:"Wallet",

      href:"/wallet",

      icon:Wallet

    },


    {

      name:"Profil",

      href:"/settings",

      icon:User

    },


    {

      name:"Alertes",

      href:"/notifications",

      icon:Bell

    }


  ];









  return (

    <nav

      className="
      fixed
      bottom-0
      left-0
      right-0
      z-50
      bg-black/80
      backdrop-blur-xl
      border-t
      border-white/10
      "

    >


      <div

        className="
        max-w-md
        mx-auto
        flex
        justify-around
        py-3
        "

      >



        {

          links.map((item)=>{


            const Icon =
            item.icon;


            const active =
            pathname === item.href;



            return (


              <Link

                key={item.href}

                href={item.href}

                className={`
                relative
                flex
                flex-col
                items-center
                gap-1
                text-xs
                transition

                ${
                  active
                  ?
                  "text-blue-400"
                  :
                  "text-gray-400"
                }

                `}

              >


                <div className="relative">


                  <Icon

                    size={22}

                  />



                  {

                    item.href === "/notifications"

                    &&

                    count > 0

                    &&


                    <span

                      className="
                      absolute
                      -top-2
                      -right-3
                      bg-red-500
                      text-white
                      text-[10px]
                      w-5
                      h-5
                      rounded-full
                      flex
                      items-center
                      justify-center
                      font-bold
                      "

                    >

                      {count}

                    </span>


                  }


                </div>



                <span>

                  {item.name}

                </span>



              </Link>


            );


          })

        }



      </div>


    </nav>

  );

}