import {
  NextResponse,
} from "next/server";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

import {
  adminAuth,
} from "@/lib/firebaseAdmin";

import {
  createDeposit,
} from "@/lib/firebaseEconomyAdmin";


export async function POST(
  request: Request
) {

  try {

    const body =
      await request.json();

    const {
      amount,
    } = body;


    if (
      !amount ||
      amount <= 0
    ) {

      return NextResponse.json(
        {
          success: false,
          error: "Montant invalide",
        },
        {
          status: 400,
        }
      );

    }


    const authHeader =
      request.headers.get(
        "authorization"
      );


    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {

      return NextResponse.json(
        {
          success: false,
          error: "Token manquant",
        },
        {
          status: 401,
        }
      );

    }


    const token =
      authHeader.replace(
        "Bearer ",
        ""
      ).trim();


    if (!token) {

      return NextResponse.json(
        {
          success: false,
          error: "Token vide",
        },
        {
          status: 401,
        }
      );

    }


    let decoded;

    try {

      decoded =
        await adminAuth.verifyIdToken(
          token
        );

    } catch (error) {

      console.error(
        "FIREBASE AUTH ERROR:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: "Token Firebase invalide",
        },
        {
          status: 401,
        }
      );

    }


    const uid =
      decoded.uid;


    const publicKey =
      process.env
        .MONCASH_PUBLIC_KEY;


    if (!publicKey) {

      return NextResponse.json(
        {
          success: false,
          error: "Configuration Moncash manquante",
        },
        {
          status: 500,
        }
      );

    }


    const depositId =
      await createDeposit(
        uid,
        amount,
        "moncash"
      );


    const moncashAmount =
      Math.round(amount * 1);


    const paymentData = {
      amount: moncashAmount,
      orderId: depositId,
    };


    const response =
      await fetch(
        "https://api.moncashbutton.com/api/v1/CreatePayment",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            "Authorization":
              `Bearer ${publicKey}`,
          },
          body: JSON.stringify(
            paymentData
          ),
        }
      );


    const result =
      await response.json();


    if (!response.ok) {

      console.error(
        "MONCASH ERROR:",
        result
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Erreur création paiement Moncash",
        },
        {
          status: 500,
        }
      );

    }


    return NextResponse.json(
      {
        success: true,
        paymentUrl: result.payment_token,
        depositId,
      },
      {
        status: 200,
      }
    );


  } catch (
    error: any
  ) {

    console.error(
      "MONCASH CREATE ERROR:",
      error
    );


    return NextResponse.json(
      {
        success: false,
        error:
          error?.message ||
          "Erreur serveur",
      },
      {
        status: 500,
      }
    );

  }

}
