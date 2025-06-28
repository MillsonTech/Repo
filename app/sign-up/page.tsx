"use client";
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile, FirebaseError } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import './styles.css';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName });
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.displayName || 'Anonymous',
        role: 'user', // Default role, can be updated later
        createdAt: new Date().toISOString(),
      });
      window.location.href = '/tasks'; // Redirect to tasks page
    } catch (err: FirebaseError) {
      setError(err.message);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Anonymous',
        role: 'user', // Default role
        createdAt: new Date().toISOString(),
      }, { merge: true }); // Use merge to avoid overwriting existing data
      window.location.href = '/tasks'; // Redirect to tasks page
    } catch (err: FirebaseError) {
      setError(err.message);
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
          <Link href="/sign-in" className="cta-button">Sign In</Link>
        </div>
      </header>

      {/* Sign-Up Section */}
      <section className="sign-up">
        <div className="container">
          <h1>Sign Up</h1>
          <p className="subtitle">Join Milson Response to help communities in crisis.</p>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleEmailSignUp} className="auth-form">
            <div className="form-group">
              <label htmlFor="displayName">Full Name</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Optional"
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
            <button type="submit" className="cta-button primary">Sign Up</button>
          </form>
          <div className="divider">or</div>
          <button onClick={handleGoogleSignUp} className="cta-button google">
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
            Already have an account? <Link href="/sign-in">Sign In</Link>
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