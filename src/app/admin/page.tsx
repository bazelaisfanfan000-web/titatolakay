"use client";

import { useState } from "react";

import Users from "@/components/admin/Users";
import Games from "@/components/admin/Games";
import Economy from "@/components/admin/Economy";
import Rewards from "@/components/admin/Rewards";
import Banned from "@/components/admin/Banned";
import Settings from "@/components/admin/Settings";


export default function AdminDashboard() {


  const [page, setPage] = useState("economy");


  const menu = [
    {
      id: "economy",
      name: "💰 Économie plateforme"
    },
    {
      id: "users",
      name: "👥 Gestion utilisateurs"
    },
    {
      id: "games",
      name: "🎮 Gestion des parties"
    },
    {
      id: "rewards",
      name: "🎁 Récompenses"
    },
    {
      id: "banned",
      name: "🚫 Utilisateurs bannis"
    },
    {
      id: "settings",
      name: "⚙️ Paramètres admin"
    }
  ];



  function renderPage() {

    switch(page) {

      case "users":
        return <Users />;

      case "games":
        return <Games />;

      case "rewards":
        return <Rewards />;

      case "banned":
        return <Banned />;

      case "settings":
        return <Settings />;

      default:
        return <Economy />;

    }

  }



  return (

    <main className="min-h-screen bg-black text-white p-5">


      <div className="flex gap-5">



        <aside className="
          hidden
          md:block
          w-72
          bg-white/5
          border
          border-white/10
          rounded-3xl
          p-5
        ">


          <h1 className="
            text-2xl
            font-black
            text-blue-500
            mb-8
          ">
            👑 DOMINOS HAÏTI
          </h1>



          <div className="space-y-3">


            {menu.map((item)=>(

              <button

                key={item.id}

                onClick={() => setPage(item.id)}

                className={
                  page === item.id
                  ?
                  "w-full text-left px-4 py-3 rounded-xl font-bold bg-blue-600"
                  :
                  "w-full text-left px-4 py-3 rounded-xl font-bold bg-white/10 hover:bg-white/20"
                }

              >

                {item.name}

              </button>


            ))}


          </div>


        </aside>





        <div className="
          md:hidden
          fixed
          top-3
          left-3
          right-3
          z-50
        ">


          <select

            value={page}

            onChange={(e)=>setPage(e.target.value)}

            className="
              w-full
              bg-black
              border
              border-white/20
              rounded-xl
              p-3
              text-white
            "

          >

            {
              menu.map((item)=>(

                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>

              ))
            }


          </select>


        </div>





        <section className="
          flex-1
          min-h-screen
          bg-white/5
          border
          border-white/10
          rounded-3xl
          p-6
        ">


          {renderPage()}


        </section>



      </div>


    </main>

  );


}