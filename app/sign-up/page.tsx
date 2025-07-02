"use client";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile, FirebaseError } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../lib/firebase";
import toast, { Toaster } from "react-hot-toast"; // Import react-hot-toast
import {create} from "zustand"; // Import Zustand
import "./styles.css";

// Zustand store for sign-up state
type SignUpState = {
  email: string;
  password: string;
  displayName: string;
  menuOpen: boolean;
  isEmailLoading: boolean;
  isGoogleLoading: boolean;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setDisplayName: (displayName: string) => void;
  toggleMenu: () => void;
  setEmailLoading: (loading: boolean) => void;
  setGoogleLoading: (loading: boolean) => void;
};

const useSignUpStore = create<SignUpState>((set) => ({
  email: "",
  password: "",
  displayName: "",
  menuOpen: false,
  isEmailLoading: false,
  isGoogleLoading: false,
  setEmail: (email) => set({ email }),
  setPassword: (password) => set({ password }),
  setDisplayName: (displayName) => set({ displayName }),
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
  setEmailLoading: (loading) => set({ isEmailLoading: loading }),
  setGoogleLoading: (loading) => set({ isGoogleLoading: loading }),
}));

export default function SignUp() {
  const router = useRouter();
  const {
    email,
    password,
    displayName,
    menuOpen,
    isEmailLoading,
    isGoogleLoading,
    setEmail,
    setPassword,
    setDisplayName,
    toggleMenu,
    setEmailLoading,
    setGoogleLoading,
  } = useSignUpStore();

  // Handle email sign-up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }
    setEmailLoading(true);
    const toastId = toast.loading("Creating account...");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: displayName || "Anonymous" });
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.displayName || "Anonymous",
        role: "user",
        createdAt: new Date().toISOString(),
      });
      toast.success("Account created successfully!", { id: toastId });
      setTimeout(() => router.push("/select-task"), 1500); // Redirect after 1.5s
    } catch (err: any) {
      toast.error(err.message || "Failed to create account.", { id: toastId });
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle Google sign-up
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    const toastId = toast.loading("Signing up with Google...");

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || "Anonymous",
          role: "user",
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
      toast.success("Signed up with Google successfully!", { id: toastId });
      setTimeout(() => router.push("/tasks"), 1500); // Redirect after 1.5s
    } catch (err: any) {
      toast.error(err.message || "Failed to sign up with Google.", { id: toastId });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Milson Response - Sign Up</title>
        <meta
          name="description"
          content="Sign up for Milson Response to start coordinating disaster response efforts."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Add Toaster component */}
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="logo">
            <Link href="/" className="logo-text">
              Milson Response
            </Link>
          </div>
          <button className="hamburger" onClick={toggleMenu} aria-label="Toggle menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H21V8H3V6ZM3 11H21V13H3V11ZM3 16H21V18H3V16Z" fill="#333" />
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
                <Link href="/sign-in" onClick={toggleMenu}>
                  Sign In
                </Link>
              </li>
            </ul>
          </nav>
          <Link href="/sign-in" className="cta-button desktop-only">
            Sign In
          </Link>
        </div>
      </header>

      {/* Sign-Up Section */}
      <section className="sign-up">
        <div className="container">
          <div className="sign-up-card">
            <h1>Sign Up</h1>
            <p className="subtitle">Join Milson Response to help communities in crisis.</p>
            <form onSubmit={handleEmailSignUp} className="auth-form">
              <div className="form-group">
                <label htmlFor="displayName">Full Name</label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
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
              <button type="submit" className="cta-button primary" disabled={isEmailLoading}>
                {isEmailLoading ? "Signing Up..." : "Sign Up"}
              </button>
            </form>
            <div className="divider">or</div>
            <button
              onClick={handleGoogleSignUp}
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
              Already have an account? <Link href="/sign-in">Sign In</Link>
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
          <p className="footer-bottom">© 2025 Milson Response. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}