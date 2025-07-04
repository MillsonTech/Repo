"use client";
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <>
      <Head>
        <title>Milson Response - Disaster Response Coordination Platform</title>
        <meta
          name="description"
          content="Milson Response empowers disaster response with real-time coordination, resource tracking, and communication for emergency services, volunteers, and communities."
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
          <button className="hamburger" onClick={toggleMenu} aria-label="Toggle menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H21V8H3V6ZM3 11H21V13H3V11ZM3 16H21V18H3V16Z" fill="#333" />
            </svg>
          </button>
          <nav className={`nav ${menuOpen ? 'open' : ''}`}>
            <ul>
              <li><Link href="#home" onClick={toggleMenu}>Home</Link></li>
              <li><Link href="#features" onClick={toggleMenu}>Features</Link></li>
              <li><Link href="#about" onClick={toggleMenu}>About</Link></li>
              <li><Link href="#testimonials" onClick={toggleMenu}>Testimonials</Link></li>
              <li><Link href="#contact" onClick={toggleMenu}>Contact</Link></li>
              {/* <li className="mobile-only">
                <Link href="/select-task" onClick={toggleMenu}>Start Coordinating</Link>
              </li> */}
            </ul>
          </nav>
          <Link href="/select-task" className="cta-button desktop-only">Get Started</Link>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="container">
          <h1>Rapid Disaster Response with Milson Response</h1>
          <p className="subtitle">
            Real-time tools for incident reporting, resource tracking, and communication to save lives and restore communities.
          </p>
          <Link href="/select-task" className="cta-button primary">Get Started</Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2>Powerful Features for Disaster Response</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <Image
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=60&h=60&q=80"
                alt="User Authentication"
                width={60}
                height={60}
                className="feature-icon"
              />
              <h3>Role-Based Authentication</h3>
              <p>Secure login for emergency services, volunteers, and admins with tailored access levels.</p>
            </div>
            <div className="feature-card">
              <Image
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=60&h=60&q=80"
                alt="Incident Reporting"
                width={60}
                height={60}
                className="feature-icon"
              />
              <h3>Incident Reporting System</h3>
              <p>Submit reports with geolocation and images for rapid situational awareness.</p>
            </div>
            <div className="feature-card">
              <Image
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=60&h=60&q=80"
                alt="Real-Time Chat"
                width={60}
                height={60}
                className="feature-icon"
              />
              <h3>Real-Time Chat & Notifications</h3>
              <p>Instant communication and updates for coordinated response efforts.</p>
            </div>
            <div className="feature-card">
              <Image
                src="https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&w=60&h=60&q=80"
                alt="Map View"
                width={60}
                height={60}
                className="feature-icon"
              />
              <h3>Map View & Resource Tracking</h3>
              <p>Visualize incidents and track resources in real time on interactive maps.</p>
            </div>
            <div className="feature-card">
              <Image
                src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=60&h=60&q=80"
                alt="Admin Dashboard"
                width={60}
                height={60}
                className="feature-icon"
              />
              <h3>Admin Dashboard</h3>
              <p>Manage tasks, allocate resources, and monitor progress from a centralized hub.</p>
            </div>
            <div className="feature-card">
              <Image
                src="https://images.unsplash.com/photo-1556745753-b2904692b3cd?q=80&w=1373&auto=format&fit=crop"
                alt="Communications System"
                width={60}
                height={60}
                className="feature-icon"
              />
              <h3>Communications System</h3>
              <p>Connect emergency services, volunteers, and citizens for seamless collaboration.</p>
            </div>
            <div className="feature-card">
              <Image
                src="https://plus.unsplash.com/premium_photo-1661284828052-ea25d6ea94cd?q=80&w=1470&auto=format&fit=crop"
                alt="Resource Allocation"
                width={60}
                height={60}
                className="feature-icon"
              />
              <h3>Resource Allocation</h3>
              <p>Efficiently distribute supplies and personnel to where they’re needed most.</p>
            </div>
            <div className="feature-card">
              <Image
                src="https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?auto=format&fit=crop&w=60&h=60&q=80"
                alt="Rescue Progress"
                width={60}
                height={60}
                className="feature-icon"
              />
              <h3>Real-Time Rescue Updates</h3>
              <p>Track and update rescue operations to ensure timely interventions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about">
        <div className="container">
          <h2>About Milson Response</h2>
          <p>
            Milson Response is a cutting-edge platform designed to enhance disaster response coordination.
            By integrating advanced GIS technology, real-time communication, and robust task management,
            we empower emergency services, volunteers, and communities to respond effectively to natural
            disasters, saving lives and reducing impact.
          </p>
          <Link href="#contact" className="cta-button secondary">Learn More</Link>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials">
        <div className="container">
          <h2>What Our Users Say</h2>
          <div className="testimonial-grid">
            <div className="testimonial-card">
              <p>&quot;Milson Response streamlined our disaster response, enabling faster resource allocation and coordination.&quot;</p>
              <h4>Emma Carter, Emergency Manager</h4>
            </div>
            <div className="testimonial-card">
              <p>&quot;The real-time chat and map view transformed how we manage volunteer efforts.&quot;</p>
              <h4>Michael Lee, Volunteer Coordinator</h4>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="cta">
        <div className="container">
          <h2>Ready to Enhance Your Disaster Response?</h2>
          <p>Join Milson Response to coordinate, track, and communicate effectively during emergencies.</p>
          <Link href="/contact" className="cta-button primary">Request a Demo</Link>
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
                <li><Link href="#home">Home</Link></li>
                <li><Link href="#features">Features</Link></li>
                <li><Link href="#about">About</Link></li>
                <li><Link href="#contact">Contact</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Contact Us</h3>
              <p>Email: info@milsonresponse.com</p>
              <p>Phone: +234 703 347 3455</p>
            </div>
          </div>
          <p className="footer-bottom">© 2025 Milson Response. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}