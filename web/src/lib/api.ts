import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, verifyCaller, type Caller } from "./firebase-admin";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Wraps a route handler: verifies the caller, checks their role, parses the
// JSON body, and turns thrown ApiErrors into JSON error responses.
export function authedRoute<Body>(
  roles: string[] | "any",
  handler: (caller: Caller, body: Body) => Promise<unknown>,
) {
  return async (request: Request) => {
    try {
      const caller = await verifyCaller(request);
      if (!caller) throw new ApiError(401, "Log in again: your session could not be verified.");
      if (roles !== "any" && !roles.includes(caller.role)) {
        throw new ApiError(403, "Only admins can do this.");
      }
      const body = (await request.json().catch(() => ({}))) as Body;
      return Response.json(await handler(caller, body));
    } catch (error) {
      if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
      console.error("API error:", error);
      return Response.json({ error: "Something went wrong on the server. Try again in a minute." }, { status: 500 });
    }
  };
}

// Audit trail of every notification sent (readable by admins).
export function logNotification(entry: {
  type: "request-created" | "request-donors" | "broadcast";
  title: string;
  body: string;
  requestId?: string;
  filters?: Record<string, unknown>;
  sent: number;
  recipients: number;
  caller: Caller;
}) {
  const { caller, ...rest } = entry;
  return adminDb().collection("notifications").add({
    ...rest,
    sentBy: caller.uid,
    sentByName: caller.name,
    createdAt: FieldValue.serverTimestamp(),
  });
}
