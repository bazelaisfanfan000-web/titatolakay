import {
  NextResponse
} from "next/server";


import {
  adminDB
} from "@/lib/firebaseAdmin";



export async function GET(){


await adminDB
.ref("champions/2026-06")
.set({

username:"Kervens Jules",

points:0,

reward:1000,

createdAt:Date.now()

});



return NextResponse.json({

success:true,

message:"Champion ajouté"

});


}
