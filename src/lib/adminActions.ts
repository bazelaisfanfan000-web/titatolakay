import { rtdb } from "@/lib/firebase";
import { ref, get, set, push } from "firebase/database";

export async function giveMoney(uid: string, amount: number) {
  const balanceRef = ref(rtdb, `users/${uid}/balance`);
  const snap = await get(balanceRef);
  const oldBalance = Number(snap.exists() ? snap.val() : 0);
  const newBalance = oldBalance + amount;

  await set(balanceRef, newBalance);

  await push(ref(rtdb, `transactions/${uid}`), {
    type: "admin_gift",
    amount,
    oldBalance,
    newBalance,
    createdAt: Date.now()
  });

  await push(ref(rtdb, `notifications/${uid}`), {
    title: "🎁 Cadeau reçu",
    message: `Vous avez reçu ${amount} HTG de l'administration`,
    read: false,
    date: Date.now()
  });
}
