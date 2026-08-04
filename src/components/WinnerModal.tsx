"use client";

type FriendStatus =
  | "none"
  | "pending"
  | "friend";

type Props = {
  winnerUid: string;
  myUid: string;
  reward: number;
  bet: number;
  pot: number;
  commission: number;
  friendStatus: FriendStatus;
  onAddFriend: () => void;
  onClose: () => void;
  isForfeit?: boolean;   // ✅ NOUVEAU
};

export default function WinnerModal({
  winnerUid,
  myUid,
  reward,
  bet,
  pot,
  commission,
  friendStatus,
  onAddFriend,
  onClose,
  isForfeit = false,   // ✅ NOUVEAU
}: Props) {
  const isWinner = winnerUid === myUid;

  const isPending =
    friendStatus === "pending";

  const isFriend =
    friendStatus === "friend";

  return (
    <div
      className="
        fixed
        inset-0
        z-[200]
        flex
        items-end
        justify-center
        overflow-y-auto
        bg-black/85
        p-0
        backdrop-blur-md
        sm:items-center
        sm:p-4
      "
    >
      <div
        className="
          relative
          w-full
          max-h-[94vh]
          overflow-y-auto
          rounded-t-[2rem]
          border
          border-blue-400/20
          bg-gradient-to-br
          from-blue-950
          via-[#05070d]
          to-black
          px-4
          pb-5
          pt-6
          text-center
          shadow-[0_-10px_50px_rgba(0,0,0,0.7)]
          sm:max-w-md
          sm:rounded-3xl
          sm:p-6
          sm:shadow-2xl
        "
      >
        {/* ========================================
            PETIT INDICATEUR MOBILE
        ======================================== */}

        <div
          className="
            mx-auto
            mb-5
            h-1
            w-12
            rounded-full
            bg-white/20
            sm:hidden
          "
        />

        {/* ========================================
            ICÔNE DU RÉSULTAT
        ======================================== */}

        <div
          className="
            mx-auto
            mb-3
            flex
            h-20
            w-20
            items-center
            justify-center
            rounded-full
            border
            border-white/10
            bg-white/[0.05]
            text-5xl
            shadow-inner
            sm:mb-4
            sm:h-24
            sm:w-24
            sm:text-6xl
          "
        >
          {isWinner ? "🏆" : "😢"}
        </div>

        {/* ========================================
            TITRE
        ======================================== */}

        <h2
          className="
            mb-2
            text-2xl
            font-black
            tracking-tight
            text-white
            sm:text-3xl
          "
        >
          {isWinner
            ? isForfeit
              ? "ABANDON !"
              : "VICTOIRE !"
            : "DÉFAITE"}
        </h2>

        {/* ========================================
            MESSAGE (avec personnalisation forfait)
        ======================================== */}

        <p
          className="
            mb-4
            px-2
            text-sm
            text-white/60
            sm:mb-5
          "
        >
          {isWinner
            ? isForfeit
              ? "Votre adversaire a abandonné, vous êtes le gagnant 🏆"
              : "Félicitations, vous avez gagné 🎉"
            : "Votre adversaire a gagné"}
        </p>

        {/* ========================================
            INFORMATIONS DE LA PARTIE
        ======================================== */}

        <div
          className="
            mb-3
            rounded-2xl
            border
            border-white/[0.08]
            bg-white/[0.04]
            p-3
            sm:mb-4
            sm:p-4
          "
        >
          {/* MISE */}

          <div
            className="
              flex
              min-h-[42px]
              items-center
              justify-between
              gap-3
              border-b
              border-white/[0.06]
              px-1
            "
          >
            <span
              className="
                text-xs
                font-medium
                text-white/60
                sm:text-sm
              "
            >
              💵 Mise
            </span>

            <b
              className="
                text-sm
                font-black
                text-white
                sm:text-base
              "
            >
              {bet} HTG
            </b>
          </div>

          {/* POT TOTAL */}

          <div
            className="
              flex
              min-h-[42px]
              items-center
              justify-between
              gap-3
              border-b
              border-white/[0.06]
              px-1
            "
          >
            <span
              className="
                text-xs
                font-medium
                text-white/60
                sm:text-sm
              "
            >
              🏦 Pot total
            </span>

            <b
              className="
                text-sm
                font-black
                text-white
                sm:text-base
              "
            >
              {pot} HTG
            </b>
          </div>

          {/* COMMISSION */}

          <div
            className="
              flex
              min-h-[42px]
              items-center
              justify-between
              gap-3
              px-1
            "
          >
            <span
              className="
                text-xs
                font-medium
                text-red-400/80
                sm:text-sm
              "
            >
              🏛️ Commission
            </span>

            <b
              className="
                text-sm
                font-black
                text-red-400
                sm:text-base
              "
            >
              -{commission} HTG
            </b>
          </div>
        </div>

        {/* ========================================
            GAIN OU PERTE
        ======================================== */}

        {isWinner ? (
          <div
            className="
              mb-4
              rounded-2xl
              border
              border-yellow-400/20
              bg-gradient-to-br
              from-yellow-500/15
              to-yellow-500/[0.03]
              px-4
              py-3
              sm:mb-5
              sm:p-4
            "
          >
            <p
              className="
                mb-1
                text-xs
                font-medium
                text-white/60
                sm:text-sm
              "
            >
              💰 Gain reçu
            </p>

            <p
              className="
                text-3xl
                font-black
                tracking-tight
                text-yellow-400
                sm:text-4xl
              "
            >
              +{reward} HTG
            </p>
          </div>
        ) : (
          <div
            className="
              mb-4
              rounded-2xl
              border
              border-red-400/20
              bg-gradient-to-br
              from-red-500/15
              to-red-500/[0.03]
              px-4
              py-3
              sm:mb-5
              sm:p-4
            "
          >
            <p
              className="
                mb-1
                text-xs
                font-medium
                text-white/60
                sm:text-sm
              "
            >
              💸 Perte
            </p>

            <p
              className="
                text-3xl
                font-black
                tracking-tight
                text-red-400
                sm:text-4xl
              "
            >
              -{bet} HTG
            </p>
          </div>
        )}

        {/* ========================================
            DEMANDER EN AMI
        ======================================== */}

        {!isFriend ? (
          <button
            type="button"
            onClick={onAddFriend}
            disabled={isPending}
            className="
              group
              relative
              mb-2.5
              flex
              min-h-[50px]
              w-full
              items-center
              justify-center
              gap-2
              overflow-hidden
              rounded-2xl
              border
              border-blue-300/40
              bg-gradient-to-br
              from-blue-400/30
              via-blue-500/20
              to-blue-700/30
              px-4
              py-3
              text-sm
              font-black
              text-white
              shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),inset_0_-3px_6px_rgba(0,30,120,0.35),0_5px_0_rgba(10,55,150,0.85),0_8px_20px_rgba(0,80,255,0.18)]
              backdrop-blur-xl
              transition-all
              duration-150
              hover:border-blue-200/60
              hover:bg-blue-400/30
              hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),inset_0_-3px_8px_rgba(0,30,120,0.4),0_5px_0_rgba(10,55,150,0.9),0_10px_25px_rgba(0,100,255,0.3)]
              active:translate-y-[4px]
              active:shadow-[inset_0_2px_5px_rgba(0,20,80,0.4),0_1px_0_rgba(10,55,150,0.8)]
              disabled:cursor-not-allowed
              disabled:opacity-60
              sm:mb-3
            "
          >
            {isPending ? (
              <>
                📩
                <span>Demande envoyée</span>
              </>
            ) : (
              <>
                🤝
                <span>Demander en ami</span>
              </>
            )}
          </button>
        ) : (
          <div
            className="
              mb-2.5
              flex
              min-h-[50px]
              w-full
              items-center
              justify-center
              gap-2
              rounded-2xl
              border
              border-green-500/20
              bg-green-500/10
              px-4
              py-3
              text-sm
              font-black
              text-green-400
              sm:mb-3
            "
          >
            👥
            <span>Vous êtes maintenant amis</span>
          </div>
        )}

        {/* ========================================
            RETOUR AU TABLEAU DE BORD
        ======================================== */}

        <button
          type="button"
          onClick={onClose}
          className="
            group
            relative
            flex
            min-h-[50px]
            w-full
            items-center
            justify-center
            overflow-hidden
            rounded-2xl
            border
            border-blue-300/35
            bg-gradient-to-br
            from-blue-400/20
            via-blue-500/10
            to-blue-800/25
            px-4
            py-3
            text-sm
            font-black
            text-blue-100
            shadow-[inset_0_1px_1px_rgba(255,255,255,0.10),inset_0_-3px_6px_rgba(0,30,120,0.3),0_5px_0_rgba(10,50,130,0.8),0_8px_18px_rgba(0,70,220,0.15)]
            backdrop-blur-xl
            transition-all
            duration-150
            hover:border-blue-200/55
            hover:bg-blue-400/20
            hover:text-white
            hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),inset_0_-3px_8px_rgba(0,30,120,0.35),0_5px_0_rgba(10,50,130,0.85),0_10px_25px_rgba(0,80,255,0.25)]
            active:translate-y-[4px]
            active:shadow-[inset_0_2px_5px_rgba(0,20,80,0.35),0_1px_0_rgba(10,50,130,0.8)]
          "
        >
          ⬅️
          <span className="ml-2">Retour au tableau de bord</span>
        </button>

        {/* ========================================
            ESPACE POUR LES PETITS ÉCRANS
        ======================================== */}

        <div className="h-[env(safe-area-inset-bottom)] sm:hidden" />
      </div>
    </div>
  );
}