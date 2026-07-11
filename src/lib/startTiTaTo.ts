import {
  ref,
  update
} from "firebase/database";

import { database } from "./firebase";

import {
  createEmptyBoard
} from "./tttEngine";



export async function startTiTaTo(
  roomId:string
){


const board = createEmptyBoard();



await update(

ref(
database,
`rooms/${roomId}`
),

{


status:"playing",


game:{


board,


turn:"X",


status:"playing",


winner:"",


turnStartedAt:Date.now()


}



}

);


}