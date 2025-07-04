"use client";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import toast, { Toaster } from "react-hot-toast";
import { PaystackButton } from "react-paystack";
import "leaflet/dist/leaflet.css";
import "../../report-incident/styles.css"; // Reuse shared styles
import "./styles.css";

// Custom marker icons for Leaflet
const incidentMarkerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png", // Red marker for incident
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

const userMarkerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png", // Blue marker for user
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

type Incident = {
  id: string;
  userId: string;
  description: string;
  photoUrls: string[];
  latitude: number;
  longitude: number;
  createdAt: Date | null;
  status: string;
};

// Haversine formula to calculate distance between two points (in kilometers)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export default function IncidentDetails() {
  const router = useRouter();
  const { id } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Get authenticated user's email
  const userEmail = auth.currentUser?.email || "";

  // Function to save donation to Firestore
  const saveDonation = async (amount: number, incidentId: string, email: string) => {
    try {
      await addDoc(collection(db, "donations"), {
        amount,
        incidentId,
        email,
        createdAt: new Date(),
      });
      toast.success("Donation recorded successfully!");
    } catch (error) {
      toast.error("Failed to record donation.");
      console.error("Error saving donation:", error);
    }
  };

  // Paystack configuration
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "";
  const paystackConfig = {
    email: userEmail,
    amount: donationAmount * 100, // Paystack expects amount in kobo
    publicKey,
    text: "Donate Now",
    onSuccess: () => {
      if (incident?.id && userEmail) {
        saveDonation(donationAmount, incident.id, userEmail);
      }
      toast.success("Thank you for your donation!");
      setDonationAmount(0);
    },
    onClose: () => {
      toast.error("Donation cancelled.");
    },
  };

  // Fetch incident details
  useEffect(() => {
    const fetchIncident = async () => {
      if (!id) return;

      setIsLoading(true);
      const toastId = toast.loading("Loading incident details...");

      try {
        const incidentDoc = await getDoc(doc(db, "incidents", id as string));
        if (!incidentDoc.exists()) {
          toast.error("Incident not found.", { id: toastId });
          router.push("/incidents");
          return;
        }

        const data = incidentDoc.data();
        setIncident({
          id: incidentDoc.id,
          userId: data.userId || "",
          description: data.description || "",
          photoUrls: data.photoUrls || [],
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          createdAt: data.createdAt ? data.createdAt.toDate() : null,
          status: data.status || "",
        });
        toast.success("Incident details loaded!", { id: toastId });
      } catch (err: any) {
        toast.error("Failed to load incident details.", { id: toastId });
        console.error("Error fetching incident:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIncident();
  }, [id, router]);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          if (incident) {
            const dist = calculateDistance(
              latitude,
              longitude,
              incident.latitude,
              incident.longitude
            );
            setDistance(dist);
          }
        },
        (error) => {
          toast.error("Failed to get your location. Please enable location services.");
          console.error("Geolocation error:", error);
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  }, [incident]);

  // Handle navigation to location
  const handleNavigateToLocation = () => {
    if (incident?.latitude && incident?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${incident.latitude},${incident.longitude}`;
      window.open(url, "_blank");
    } else {
      toast.error("Location data unavailable.");
    }
  };

  // Handle photo click for full-screen view
  const openPhoto = (url: string) => {
    setSelectedPhoto(url);
  };

  const closePhoto = useCallback(() => {
    setSelectedPhoto(null);
  }, []);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closePhoto();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closePhoto]);

  // Redirect to login if user is not authenticated
  if (!userEmail) {
    toast.error("Please log in to view incident details or donate.");
    router.push("/login");
    return null;
  }

  if (isLoading) {
    return (
      <div className="container">
        <p>Loading incident details...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="container">
        <p>Incident not found.</p>
        <Link href="/incidents" className="cta-button primary">
          Back to Incidents
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Milson Response - Incident Details</title>
        <meta name="description" content={`Details for incident: ${incident.description}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

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
              <li><Link href="/#contact">Contact</Link></li>
              <li><Link href="/incidents">Incidents</Link></li>
            </ul>
          </nav>
        </div>
      </header>

      <section className="incident-details">
        <div className="container">
          <h1>Incident Details</h1>
          <p className="subtitle">{incident.description}</p>

          <div className="incident-details-grid">
            <div className="details-column">
              <div className="details-section">
                <h2>Incident Information</h2>
                <p>{incident.description}</p>
                
                {distance !== null && (
                  <p>
                    <strong>Distance:</strong> {distance.toFixed(2)} km
                  </p>
                )}
                {incident.createdAt && (
                  <p>
                    <strong>Date Reported:</strong> {incident.createdAt.toLocaleString()}
                  </p>
                )}
                <p>
                  <strong>Status:</strong>{" "}
                  {incident.status.toLowerCase() === "approved" ? "Ongoing" : incident.status}
                </p>
                <button
                  className="cta-button primary navigate-button"
                  onClick={handleNavigateToLocation}
                >
                  Navigate to Location
                </button>
              </div>

              {incident.photoUrls.length > 0 && (
                <div className="photos-section">
                  <h2>Photos</h2>
                  <div className="photo-grid">
                    {incident.photoUrls.map((url, index) => (
                      <div
                        key={index}
                        className="photo-wrapper"
                        onClick={() => openPhoto(url)}
                      >
                        <Image
                          src={url}
                          alt={`Incident photo ${index + 1}`}
                          width={150}
                          height={150}
                          className="photo-thumbnail"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="map-column">
              <div className="map-section">
                <div className="map-container">
                  <MapContainer
                    center={[incident.latitude || 0, incident.longitude || 0]}
                    zoom={15}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {incident.latitude && incident.longitude && (
                      <Marker
                        position={[incident.latitude, incident.longitude]}
                        icon={incidentMarkerIcon}
                      />
                    )}
                    {userLocation && (
                      <Marker
                        position={[userLocation.latitude, userLocation.longitude]}
                        icon={userMarkerIcon}
                      />
                    )}
                  </MapContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="donation-section">
            <h2>Support Relief Efforts</h2>
            <form className="donation-form">
              <div className="form-group">
                <label htmlFor="donationAmount">Donation Amount (NGN)</label>
                <input
                  type="number"
                  id="donationAmount"
                  value={donationAmount || ""}
                  onChange={(e) => setDonationAmount(Number(e.target.value))}
                  min="100"
                  placeholder="Enter amount in NGN"
                  required
                />
              </div>
              <PaystackButton
                {...paystackConfig}
                className="cta-button primary"
                disabled={!userEmail || donationAmount < 100}
              />
            </form>
          </div>
        </div>
      </section>

      {/* Full-screen photo modal */}
      {selectedPhoto && (
        <div className="photo-modal" onClick={closePhoto}>
          <div className="photo-modal-content">
            <button className="close-button" onClick={closePhoto}>
              ×
            </button>
            <Image
              src={selectedPhoto}
              alt="Full-screen incident photo"
              layout="fill"
              objectFit="contain"
              className="full-screen-photo"
            />
          </div>
        </div>
      )}

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