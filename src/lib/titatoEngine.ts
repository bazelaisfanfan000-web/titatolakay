// src/lib/tttEngine.ts


export function makeMove(

board:string[][],

row:number,

col:number,

symbol:"X"|"O"

):string[][]{


const newBoard = board.map(

(line)=>[...line]

);



newBoard[row][col] = symbol;



return newBoard;

}







export function checkWinner(

board:string[][]

):"X"|"O"|null{


const size = 10;

const winLength = 4;



const directions:[number,number][] = [

[0,1],
[1,0],
[1,1],
[1,-1]

];




for(let row=0; row<size; row++){

for(let col=0; col<size; col++){


const player = board[row][col];


if(player !== "X" && player !== "O"){

continue;

}



for(const [dx,dy] of directions){


let count = 1;



for(let i=1;i<winLength;i++){


const x = row + dx*i;

const y = col + dy*i;



if(

x>=0 &&
x<size &&
y>=0 &&
y<size &&
board[x][y]===player

){

count++;

}else{

break;

}


}





for(let i=1;i<winLength;i++){


const x = row - dx*i;

const y = col - dy*i;



if(

x>=0 &&
x<size &&
y>=0 &&
y<size &&
board[x][y]===player

){

count++;

}else{

break;

}


}





if(count>=winLength){

return player;

}



}



}



}



return null;

}