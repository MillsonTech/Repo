"use client";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  FirebaseError,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import toast, { Toaster } from "react-hot-toast"; // Import react-hot-toast
import {create} from "zustand"; // Import Zustand
import "./styles.css";

// Zustand store for sign-in state
type SignInState = {
  email: string;
  password: string;
  menuOpen: boolean;
  isEmailLoading: boolean;
  isGoogleLoading: boolean;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  toggleMenu: () => void;
  setEmailLoading: (loading: boolean) => void;
  setGoogleLoading: (loading: boolean) => void;
};

const useSignInStore = create<SignInState>((set) => ({
  email: "",
  password: "",
  menuOpen: false,
  isEmailLoading: false,
  isGoogleLoading: false,
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
  setEmailLoading: (loading) => set({ isEmailLoading: loading }),
  setGoogleLoading: (loading) => set({ isGoogleLoading: loading }),
}));

export default function SignIn() {
  const router = useRouter();
  const {
    email,
    password,
    menuOpen,
    isEmailLoading,
    isGoogleLoading,
    setEmail,
    setPassword,
    toggleMenu,
    setEmailLoading,
    setGoogleLoading,
  } = useSignInStore();

  // Handle email sign-in
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }
    setEmailLoading(true);
    const toastId = toast.loading("Signing in...");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Signed in successfully!", { id: toastId });
      setTimeout(() => router.push("/select-task"), 1500); // Redirect after 1.5s
    } catch (err: any) {
      toast.error(handleFirebaseError(err), { id: toastId });
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const toastId = toast.loading("Signing in with Google...");

    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Signed in with Google successfully!", { id: toastId });
      setTimeout(() => router.push("/select-task"), 1500); // Redirect after 1.5s
    } catch (err: any) {
      toast.error(handleFirebaseError(err), { id: toastId });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Map Firebase error codes to user-friendly messages
  const handleFirebaseError = (err: FirebaseError) => {
    switch (err.code) {
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password.";
      case "auth/invalid-email":
        return "Invalid email format.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      default:
        return err.message || "Failed to sign in.";
    }
  };

  return (
    <>
      <Head>
        <title>Milson Response - Sign In</title>
        <meta
          name="description"
          content="Sign in to Milson Response to coordinate disaster response efforts."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Add Toaster component */}
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <header className="header">
        <div className="container">
          <div className="logo">
            <Link href="/" className="logo-text">
              Milson Response
            </Link>
          </div>
          <button
            className="hamburger"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 6H21V8H3V6ZM3 11H21V13H3V11ZM3 16H21V18H3V16Z"
                fill="#333"
              />
            </svg>
          </button>
          <nav className={`nav ${menuOpen ? "open" : ""}`}>
            <ul>
              <li>
                <Link href="/#home" onClick={toggleMenu}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#features" onClick={toggleMenu}>
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#about" onClick={toggleMenu}>
                  About
                </Link>
              </li>
              <li>
                <Link href="/#testimonials" onClick={toggleMenu}>
                  Testimonials
                </Link>
              </li>
              <li>
                <Link href="/#contact" onClick={toggleMenu}>
                  Contact
                </Link>
              </li>
              <li className="mobile-only">
                <Link href="/sign-up" onClick={toggleMenu}>
                  Sign Up
                </Link>
              </li>
            </ul>
          </nav>
          <Link href="/sign-up" className="cta-button desktop-only">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Sign-In Section */}
      <section className="sign-in">
        <div className="container">
          <div className="sign-in-card">
            <h1>Sign In</h1>
            <p className="subtitle">
              Access your Milson Response account to start coordinating.
            </p>
            <form onSubmit={handleEmailSignIn} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                />
              </div>
              <button
                type="submit"
                className="cta-button primary"
                disabled={isEmailLoading}
              >
                {isEmailLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>
            <div className="divider">or</div>
            <button
              onClick={handleGoogleSignIn}
              className="cta-button google"
              disabled={isGoogleLoading}
            >
              <svg
                className="google-icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.02.68-2.33 1.09-3.71 1.09-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {isGoogleLoading ? "Processing..." : "Continue with Google"}
            </button>
            <p className="switch-auth">
              Don’t have an account? <Link href="/sign-up">Sign Up</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>Milson Response</h3>
              <p>Empowering disaster response worldwide.</p>
            </div>
            <div className="footer-section">
              <h3>Quick Links</h3>
              <ul>
                <li>
                  <Link href="/#home">Home</Link>
                </li>
                <li>
                  <Link href="/#features">Features</Link>
                </li>
                <li>
                  <Link href="/#about">About</Link>
                </li>
                <li>
                  <Link href="/#contact">Contact</Link>
                </li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Contact Us</h3>
              <p>Email: info@milsonresponse.com</p>
              <p>Phone: +1 (800) 123-4567</p>
            </div>
          </div>
          <p className="footer-bottom">
            © 2025 Milson Response. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  );
}