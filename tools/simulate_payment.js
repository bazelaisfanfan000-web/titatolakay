const admin = require('firebase-admin');

async function main(){
  if(!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_DATABASE_URL){
    console.error('Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL in env');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });

  const db = admin.database();
  const auth = admin.auth();

  try{
    console.log('Creating two test users...');
    const timestamp = Date.now();
    const u1 = await auth.createUser({displayName:`TestUserA_${timestamp}`, email:`testA_${timestamp}@example.com`});
    const u2 = await auth.createUser({displayName:`TestUserB_${timestamp}`, email:`testB_${timestamp}@example.com`});

    console.log('Users created:', u1.uid, u2.uid);

    // set initial balances
    await db.ref(`users/${u1.uid}/balance`).set(800);
    console.log('CREATE BALANCE', { uid: u1.uid, balance: 800 });
    await db.ref(`users/${u2.uid}/balance`).set(800);
    console.log('CREATE BALANCE', { uid: u2.uid, balance: 800 });

    // create room
    const roomId = `test_room_${timestamp}`;
    const bet = 100;
    const pot = bet * 2;

    const roomData = {
      id: roomId,
      bet,
      pot,
      players: {
        [u1.uid]: { uid: u1.uid, symbol: 'X', betPaid: true },
        [u2.uid]: { uid: u2.uid, symbol: 'O', betPaid: true }
      },
      game: {
        status: 'finished',
        winner: 'X'
      }
    };

    await db.ref(`rooms/${roomId}`).set(roomData);
    console.log('Room created', roomId);

    // simulate server finish-payment logic
    console.log('Running finish-payment logic...');

    const snap = await db.ref(`rooms/${roomId}`).get();
    const room = snap.val();
    if(!room) throw new Error('Room not found');
    if(room.game?.paymentStatus === 'completed'){
      console.log('Already paid');
    }

    const winnerSymbol = room.game.winner;
    let winnerUid = '';
    for(const [uid, player] of Object.entries(room.players || {})){
      if(player.symbol === winnerSymbol) winnerUid = uid;
    }
    if(!winnerUid) throw new Error('Winner not found');
    console.log('WINNER FOUND', { gameId: roomId, winnerSymbol, winnerUid });

    // mark processing
    await db.ref(`rooms/${roomId}/game/paymentStatus`).set('processing');

    const commission = Math.floor((room.pot || 0) * 0.10);
    const reward = (room.pot || 0) - commission;

    // credit winner atomically
    let oldBalance = 0;
    let newBalance = 0;
    await db.ref(`users/${winnerUid}/balance`).transaction(current => {
      oldBalance = Number(current || 0);
      newBalance = oldBalance + reward;
      return newBalance;
    });

    // write transaction
    await db.ref(`transactions/${winnerUid}`).push({
      type: 'win',
      amount: reward,
      gameId: roomId,
      oldBalance,
      newBalance,
      status: 'completed',
      createdAt: Date.now()
    });

    // platform earnings
    await db.ref('platform/earnings').push({ type: 'commission', gameId: roomId, amount: commission, createdAt: Date.now() });

    // update room
    await db.ref(`rooms/${roomId}/game`).update({ paymentStatus: 'completed', winnerUid, reward, commission, paidAt: Date.now() });

    console.log('PAYMENT SUCCESS', { winnerUid, reward, oldBalance, newBalance });

    // verify balances
    const finalWinnerBal = (await db.ref(`users/${winnerUid}/balance`).get()).val();
    console.log('Winner final balance:', finalWinnerBal);

    // verify loser unchanged
    const loserUid = winnerUid === u1.uid ? u2.uid : u1.uid;
    const finalLoserBal = (await db.ref(`users/${loserUid}/balance`).get()).val();
    console.log('Loser final balance:', finalLoserBal);

    if(Number(finalWinnerBal) !== newBalance){
      console.error('Balance mismatch! Expected', newBalance, 'got', finalWinnerBal);
    } else {
      console.log('Balance correctly credited.');
    }

    // cleanup: delete test users and room
    await db.ref(`rooms/${roomId}`).remove();
    await auth.deleteUser(u1.uid);
    await auth.deleteUser(u2.uid);
    console.log('Cleaned up test users and room.');

    process.exit(0);
  } catch(err){
    console.error('Error during simulation', err);
    process.exit(1);
  }
}

main();
