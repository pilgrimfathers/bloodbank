import { verifyCaller } from "@/lib/firebase-admin";

// Returns who the caller is, based on their Firebase ID token. Used by the
// apps to confirm the API can verify logins before notifications build on it.
export async function GET(request: Request) {
  let caller;
  try {
    caller = await verifyCaller(request);
  } catch (error) {
    console.error("Admin SDK not configured:", error);
    return Response.json({ error: "Server is missing Firebase admin credentials." }, { status: 500 });
  }
  if (!caller) {
    return Response.json({ error: "Send a valid Firebase ID token as 'Authorization: Bearer <token>'." }, { status: 401 });
  }
  return Response.json(caller);
}
