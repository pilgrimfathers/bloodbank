import "server-only";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Credentials come from a service account key stored in Vercel env vars
// (never committed). FIREBASE_PRIVATE_KEY keeps its "\n" escapes in the env.
function adminApp() {
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase admin credentials missing: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => getFirestore(adminApp());

export type Caller = { uid: string; role: string; name: string };

// Verifies the Firebase ID token in an "Authorization: Bearer <token>" header
// and loads the caller's role from their user document.
export async function verifyCaller(request: Request): Promise<Caller | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  // Credential problems throw; only a bad token returns null.
  const auth = adminAuth();
  try {
    const { uid } = await auth.verifyIdToken(token);
    const snap = await adminDb().collection("users").doc(uid).get();
    const data = snap.data() ?? {};
    return { uid, role: data.role ?? "donor", name: data.name ?? "" };
  } catch {
    return null;
  }
}
