import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, ArrowRight, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function AuthPage() {
  const [channel, setChannel] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'ok' | 'err'; message: string } | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const destination = channel === 'email' ? email : phone;

  useEffect(() => {
    const url = new URL(window.location.href);
    const err = url.searchParams.get('error');
    if (err === 'google_not_configured') {
      setStatus({ type: 'err', message: 'Google sign-in is not configured yet' });
    }
  }, []);

  const requestOtp = async () => {
    setStatus(null);
    setDevOtp(null);
    setIsRequesting(true);
    try {
      const resp = await fetch('/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(
          channel === 'email'
            ? { channel, email: email.trim() }
            : { channel, phone: phone.trim() }
        ),
      });
      const json = (await resp.json()) as { requestId?: string; devOtp?: string; error?: string };
      if (!resp.ok || !json.requestId) {
        setStatus({ type: 'err', message: json.error || 'Failed to send code' });
        return;
      }
      setRequestId(json.requestId);
      setDevOtp(json.devOtp || null);
      setStatus({ type: 'ok', message: 'OTP sent' });
    } catch {
      setStatus({ type: 'err', message: 'Failed to send code' });
    } finally {
      setIsRequesting(false);
    }
  };

  const resendOtp = async () => {
    if (!requestId) return;
    setStatus(null);
    setDevOtp(null);
    setIsRequesting(true);
    try {
      const resp = await fetch('/auth/otp/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId }),
      });
      const json = (await resp.json()) as { devOtp?: string; error?: string };
      if (!resp.ok) {
        setStatus({ type: 'err', message: json.error || 'Failed to resend code' });
        return;
      }
      setDevOtp(json.devOtp || null);
      setStatus({ type: 'ok', message: 'OTP resent' });
    } catch {
      setStatus({ type: 'err', message: 'Failed to resend code' });
    } finally {
      setIsRequesting(false);
    }
  };

  const verifyOtp = async () => {
    if (!requestId) return;
    setStatus(null);
    setIsVerifying(true);
    try {
      const resp = await fetch('/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId, otp }),
      });
      const json = (await resp.json()) as { error?: string };
      if (!resp.ok) {
        setStatus({ type: 'err', message: json.error || 'Invalid OTP' });
        return;
      }
      setStatus({ type: 'ok', message: 'Signed in' });
      window.location.href = '/profile';
    } catch {
      setStatus({ type: 'err', message: 'OTP verification failed' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full opacity-20 blur-3xl"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-200 to-amber-200 rounded-full opacity-20 blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="text-3xl">⚡</div>
          <span className="font-bold text-2xl bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Biome
          </span>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Sign in to Deepenk</h1>
            <p className="text-muted-foreground">
              Continue with Google or use OTP via email/phone
            </p>
          </div>

          {status && (
            <div
              className={`text-sm rounded-lg px-3 py-2 mb-4 ${
                status.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {status.message}
            </div>
          )}

          <div className="mb-6">
            <Button
              type="button"
              className="w-full bg-white text-foreground border border-amber-100 hover:bg-amber-50"
              onClick={() => (window.location.href = '/auth/google')}
            >
              <span className="mr-2">🔵</span>
              Continue with Google
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-amber-100" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-muted-foreground">Or use OTP</span>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={channel === 'email' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setChannel('email');
                setRequestId(null);
                setOtp('');
                setStatus(null);
                setDevOtp(null);
              }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button
              type="button"
              variant={channel === 'phone' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => {
                setChannel('phone');
                setRequestId(null);
                setOtp('');
                setStatus(null);
                setDevOtp(null);
              }}
            >
              <Phone className="w-4 h-4 mr-2" />
              Phone
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {channel === 'email' ? 'Email Address' : 'Phone Number'}
              </label>
              <div className="relative">
                {channel === 'email' ? (
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                ) : (
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                )}
                <input
                  type={channel === 'email' ? 'email' : 'tel'}
                  value={destination}
                  onChange={(e) => (channel === 'email' ? setEmail(e.target.value) : setPhone(e.target.value))}
                  placeholder={channel === 'email' ? 'you@example.com' : '+91XXXXXXXXXX'}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-amber-100 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                />
              </div>
            </div>

            {!requestId && (
              <Button
                type="button"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                disabled={!destination.trim() || isRequesting}
                onClick={requestOtp}
              >
                Send code
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}

            {requestId && (
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground">
                  Code sent to {channel === 'email' ? email : phone}
                </div>

                {devOtp && (
                  <div className="text-xs rounded-lg px-3 py-2 bg-amber-50 text-amber-800 border border-amber-100">
                    Dev OTP: {devOtp}
                  </div>
                )}

                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  type="button"
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                  disabled={otp.trim().length < 4 || isVerifying}
                  onClick={verifyOtp}
                >
                  Verify & Sign in
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isRequesting}
                  onClick={resendOtp}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend code
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setRequestId(null);
                    setOtp('');
                    setDevOtp(null);
                    setStatus(null);
                  }}
                >
                  Change {channel === 'email' ? 'email' : 'phone'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our{' '}
          <a href="#" className="text-amber-600 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-amber-600 hover:underline">
            Privacy Policy
          </a>
        </p>
      </motion.div>
    </div>
  );
}
