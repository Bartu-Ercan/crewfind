import { getServerUserClient, getSupabaseAdminClient } from "@/backend/supabase/server-admin";

export async function DELETE(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!accessToken) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });

  try {
    const userClient = getServerUserClient(accessToken);
    const { data, error } = await userClient.auth.getUser(accessToken);
    if (error || !data.user || data.user.is_anonymous) {
      return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
    }
    const lastSignInAt = data.user.last_sign_in_at ? Date.parse(data.user.last_sign_in_at) : Number.NaN;
    if (!Number.isFinite(lastSignInAt) || Date.now() - lastSignInAt > 10 * 60 * 1000) {
      return Response.json({ code: "REAUTH_REQUIRED" }, { status: 403 });
    }
    await userClient.rpc("leave_current");
    const { error: deleteError } = await getSupabaseAdminClient().auth.admin.deleteUser(data.user.id);
    if (deleteError) throw deleteError;
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ code: "DELETE_FAILED" }, { status: 500 });
  }
}
