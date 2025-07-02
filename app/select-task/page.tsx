"use client";
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import './styles.css';

export default function Tasks() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Toggle menu for mobile
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  const handleTaskClick = (path: string) => {
    if (isLoggedIn) {
      router.push(path); // Navigate to task page
    } else {
      router.push('/sign-in'); // Redirect to sign-in
    }
  };

  return (
    <>
      <Head>
        <title>Milson Response - Select Your Task</title>
        <meta
          name="description"
          content="Choose your task with Milson Response: Report an incident or volunteer to support disaster response efforts."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      {/* <header className="header">
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
          <nav className={`nav ${menuOpen ? 'open' : ''}`}>
            <ul>
              <li><Link href="/#home" onClick={toggleMenu}>Home</Link></li>
              <li><Link href="/#features" onClick={toggleMenu}>Features</Link></li>
              <li><Link href="/#about" onClick={toggleMenu}>About</Link></li>
              <li><Link href="/#testimonials" onClick={toggleMenu}>Testimonials</Link></li>
              <li><Link href="/#contact" onClick={toggleMenu}>Contact</Link></li>
              <li className="mobile-only">
                <Link href="/#contact" onClick={toggleMenu}>Start Coordinating</Link>
              </li>
            </ul>
          </nav>
          <Link href="/#contact" className="cta-button desktop-only">Start Coordinating</Link>
        </div>
      </header> */}

      {/* Task Selection Section */}
      <section id="tasks" className="tasks">
        <div className="container">
          <h1>Select Task</h1>
          <br></br><br></br>
          
          <div className="task-grid">
            <div className="task-card">
              <Image
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=80&h=80&q=80"
                alt="Report Incident"
                width={80}
                height={80}
                className="task-icon"
              />
              <h2>Report Incident</h2>
              <p>Submit real-time incident reports with geolocation and images to aid rapid response.</p>
              <button
                onClick={() => handleTaskClick('/report-incident')}
                className="cta-button primary"
              >
                Report Now
              </button>
            </div>
            <div className="task-card">
              <Image
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=80&h=80&q=80"
                alt="Volunteer"
                width={80}
                height={80}
                className="task-icon"
              />
              <h2>Volunteer</h2>
              <p>Join our efforts to support disaster-affected communities through coordinated action.</p>
              <button
                onClick={() => handleTaskClick('/all-incidents')}
                className="cta-button primary"
              >
                Volunteer Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      {/* <footer className="footer">
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
      </footer> */}
    </>
  );
}