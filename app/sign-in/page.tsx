"use client";
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, FirebaseError } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import './styles.css';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = '/tasks'; // Redirect to tasks page
    } catch (err: FirebaseError) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      window.location.href = '/tasks'; // Redirect to tasks page
    } catch (err: FirebaseError) {
      setError(err.message);
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

      {/* Header */}
      <header className="header">
        <div className="container">
          <div className="logo">
            <Link href="/" className="logo-text">
              Milson Response
            </Link>
          </div>
          <nav className="nav">
            <ul>
              <li><Link href="/#home">Home</Link></li>
              <li><Link href="/#features">Features</Link></li>
              <li><Link href="/#about">About</Link></li>
              <li><Link href="/#testimonials">Testimonials</Link></li>
              <li><Link href="/#contact">Contact</Link></li>
            </ul>
          </nav>
          <Link href="/sign-up" className="cta-button">Sign Up</Link>
        </div>
      </header>

      {/* Sign-In Section */}
      <section className="sign-in">
        <div className="container">
          <h1>Sign In</h1>
          <p className="subtitle">Access your Milson Response account to start coordinating.</p>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleEmailSignIn} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
              />
            </div>
            <button type="submit" className="cta-button primary">Sign In</button>
          </form>
          <div className="divider">or</div>
          <button onClick={handleGoogleSignIn} className="cta-button google">
            <Image
              src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=40&h=40&q=80"
              alt="Google Logo"
              width={40}
              height={40}
              className="google-icon"
            />
            Continue with Google
          </button>
          <p className="switch-auth">
            Don’t have an account? <Link href="/sign-up">Sign Up</Link>
          </p>
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
                <li><Link href="/#home">Home</Link></li>
                <li><Link href="/#features">Features</Link></li>
                <li><Link href="/#about">About</Link></li>
                <li><Link href="/#contact">Contact</Link></li>
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