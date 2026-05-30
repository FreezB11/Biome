import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { EmailLoginSchema } from "../dto/auth";
import { authOptional, authRequired } from "../middleware/auth";
import { userRepo } from "../repositories";
import { otpService } from "../services/otpService";
import { buildGoogleAuthUrl, createGoogleAuthState, exchangeCodeForProfile, isGoogleConfigured } from "../services/googleOAuth";
import { createEmailSender, createSmsSender, isEmailSenderConfigured, isSmsSenderConfigured } from "../services/otpSenders";

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev_jwt_secret_change_me";
}

function signToken(payload: { id: string; email?: string; phone?: string; name?: string }) {
  return jwt.sign(payload, getJwtSecret(), { algorithm: "HS256", expiresIn: "7d" });
}

function getFrontendBaseUrl(req: Request) {
  const fromEnv = process.env.FRONTEND_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function getGoogleRedirectUri(req: Request) {
  const fromEnv = process.env.GOOGLE_REDIRECT_URI;
  if (fromEnv) return fromEnv;
  return `${req.protocol}://${req.get("host")}/auth/google/callback`;
}

const router = Router();
const emailSender = createEmailSender();
const smsSender = createSmsSender();

router.get("/config", (_req: Request, res: Response) => {
  res.json({
    google: isGoogleConfigured(),
    emailOtp: isEmailSenderConfigured(),
    smsOtp: isSmsSenderConfigured(),
  });
});

router.get("/google", (_req: Request, res: Response) => {
  if (!isGoogleConfigured()) {
    res.redirect(`${getFrontendBaseUrl(_req)}/auth?error=google_not_configured`);
    return;
  }
  const state = createGoogleAuthState();
  res.cookie("deepenk_google_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
  });
  res.redirect(buildGoogleAuthUrl({ state, redirectUri: getGoogleRedirectUri(_req) }));
});

router.get("/google/callback", async (req: Request, res: Response) => {
  const query = z.object({ code: z.string().min(1), state: z.string().min(1) }).safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "INVALID_QUERY", details: query.error.flatten() });
    return;
  }

  const expectedState = (req.cookies as Record<string, unknown> | undefined)?.deepenk_google_state;
  if (typeof expectedState !== "string" || expectedState !== query.data.state) {
    res.status(400).json({ error: "INVALID_STATE" });
    return;
  }

  if (!isGoogleConfigured()) {
    res.status(501).json({ error: "GOOGLE_NOT_CONFIGURED" });
    return;
  }

  const profile = await exchangeCodeForProfile({ code: query.data.code, redirectUri: getGoogleRedirectUri(req) });
  if (!profile.email) {
    res.status(400).json({ error: "GOOGLE_NO_EMAIL" });
    return;
  }

  const user = await userRepo.upsertByEmail({ email: profile.email, name: profile.name, provider: "google" });

  const token = signToken({ id: user.id, email: user.email, name: user.name });
  res.cookie("deepenk_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.redirect(`${getFrontendBaseUrl(req)}/profile`);
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = EmailLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    return;
  }

  const user = await userRepo.upsertByEmail({
    email: parsed.data.email,
    name: parsed.data.name,
    provider: "email",
  });

  const token = signToken({ id: user.id, email: user.email, name: user.name });
  res.cookie("deepenk_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ user, token });
});

router.post("/otp/request", async (req: Request, res: Response) => {
  const parsed = z
    .object({
      channel: z.enum(["email", "phone"]),
      email: z.string().email().optional(),
      phone: z.string().min(8).max(20).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    return;
  }

  const destination =
    parsed.data.channel === "email"
      ? parsed.data.email
      : parsed.data.phone;
  if (!destination) {
    res.status(400).json({ error: "MISSING_DESTINATION" });
    return;
  }

  if (process.env.NODE_ENV === "production") {
    if (parsed.data.channel === "email" && !isEmailSenderConfigured()) {
      res.status(501).json({ error: "EMAIL_SENDER_NOT_CONFIGURED" });
      return;
    }
    if (parsed.data.channel === "phone" && !isSmsSenderConfigured()) {
      res.status(501).json({ error: "SMS_SENDER_NOT_CONFIGURED" });
      return;
    }
  }

  const { requestId, expiresAt, otp } = await otpService.requestOtp({
    channel: parsed.data.channel,
    destination,
  });

  try {
    if (parsed.data.channel === "email") {
      await emailSender.send({ to: destination, code: otp });
    } else {
      await smsSender.send({ to: destination, code: otp });
    }
  } catch (e) {
    res.status(502).json({ error: String(e instanceof Error ? e.message : e) });
    return;
  }

  res.json({
    requestId,
    expiresAt,
    devOtp: process.env.NODE_ENV === "production" ? undefined : otp,
  });
});

router.post("/otp/resend", async (req: Request, res: Response) => {
  const parsed = z.object({ requestId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    return;
  }
  try {
    const { requestId, expiresAt, otp, channel, destination } = await otpService.resendOtp({ requestId: parsed.data.requestId });

    if (process.env.NODE_ENV === "production") {
      if (channel === "email" && !isEmailSenderConfigured()) {
        res.status(501).json({ error: "EMAIL_SENDER_NOT_CONFIGURED" });
        return;
      }
      if (channel === "phone" && !isSmsSenderConfigured()) {
        res.status(501).json({ error: "SMS_SENDER_NOT_CONFIGURED" });
        return;
      }
    }

    try {
      if (channel === "email") {
        await emailSender.send({ to: destination, code: otp });
      } else {
        await smsSender.send({ to: destination, code: otp });
      }
    } catch (e) {
      res.status(502).json({ error: String(e instanceof Error ? e.message : e) });
      return;
    }

    res.json({
      requestId,
      expiresAt,
      devOtp: process.env.NODE_ENV === "production" ? undefined : otp,
    });
  } catch (e) {
    res.status(400).json({ error: String(e instanceof Error ? e.message : e) });
  }
});

router.post("/otp/verify", async (req: Request, res: Response) => {
  const parsed = z.object({ requestId: z.string().min(1), otp: z.string().min(4).max(10) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "INVALID_BODY", details: parsed.error.flatten() });
    return;
  }

  try {
    const verified = await otpService.verifyOtp({ requestId: parsed.data.requestId, otp: parsed.data.otp });
    const user =
      verified.channel === "email"
        ? await userRepo.upsertByEmail({ email: verified.destination, provider: "email" })
        : await userRepo.upsertByPhone({ phone: verified.destination });

    const token = signToken({ id: user.id, email: user.email, phone: user.phone, name: user.name });
    res.cookie("deepenk_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ user, token });
  } catch (e) {
    res.status(400).json({ error: String(e instanceof Error ? e.message : e) });
  }
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("deepenk_token");
  res.json({ success: true });
});

router.get("/me", authOptional(), async (req: Request, res: Response) => {
  const userId = req.ctx?.userId;
  if (!userId) {
    res.json({ user: null });
    return;
  }
  const user = await userRepo.getById(userId);
  res.json({ user });
});

router.get("/me/required", authRequired(), async (req: Request, res: Response) => {
  const user = await userRepo.getById(req.ctx!.userId!);
  res.json({ user });
});

export default router;
