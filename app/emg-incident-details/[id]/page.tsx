// IncidentDetails.tsx
"use client";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import toast, { Toaster } from "react-hot-toast";
import "leaflet/dist/leaflet.css";
import "../../report-incident/styles.css";
import "./styles.css";

// Custom marker icons for Leaflet
const incidentMarkerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

const userMarkerIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
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

// Haversine formula to calculate distance
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function IncidentDetails() {
  const router = useRouter();
  const { id } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const userEmail = auth.currentUser?.email || "";

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
          toast.error(
            "Failed to get your location. Please enable location services."
          );
          console.error("Geolocation error:", error);
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  }, [incident]);

  // Handle status update
  const handleStatusUpdate = async (newStatus: string) => {
    if (!incident?.id) return;

    const toastId = toast.loading("Updating status...");
    try {
      await updateDoc(doc(db, "incidents", incident.id), {
        emgStatus: newStatus,
      });
      setIncident((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast.success(`Status updated to ${newStatus}!`, { id: toastId });
    } catch (error) {
      toast.error("Failed to update status.", { id: toastId });
      console.error("Error updating status:", error);
    }
  };

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
    toast.error("Please log in to view incident details.");
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
        <meta
          name="description"
          content={`Details for incident: ${incident.description}`}
        />
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
              <li>
                <Link href="/incidents">Incidents</Link>
              </li>
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
                    <strong>Date Reported:</strong>{" "}
                    {incident.createdAt.toLocaleString()}
                  </p>
                )}
                <p>
                  <strong>Status:</strong>{" "}
                  {incident.status.toLowerCase() === "completed"
                    ? "Incident addressed successfully"
                    : incident.status.toLowerCase() === "approved"
                    ? "Ongoing"
                    : incident.status}
                </p>
                <button
                  className="cta-button primary navigate-button"
                  onClick={handleNavigateToLocation}
                >
                  Navigate to Location
                </button>
                {/* Status Update Section */}
                <div className="status-update-section">
                  <h3>Update Incident Status</h3>
                  <div className="status-buttons">
                    <button
                      className="cta-button secondary"
                      onClick={() => handleStatusUpdate("On the Way")}
                      disabled={
                        incident.status === "On the Way" ||
                        incident.status === "Arrived" ||
                        incident.status === "Completed"
                      }
                    >
                      On the Way
                    </button>
                    <button
                      className="cta-button secondary"
                      onClick={() => handleStatusUpdate("Arrived")}
                      disabled={
                        incident.status === "Arrived" ||
                        incident.status === "Completed"
                      }
                    >
                      Arrived
                    </button>
                    <button
                      className="cta-button secondary"
                      onClick={() => handleStatusUpdate("Completed")}
                      disabled={incident.status === "Completed"}
                    >
                      Completed
                    </button>
                  </div>
                </div>
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
                        position={[
                          userLocation.latitude,
                          userLocation.longitude,
                        ]}
                        icon={userMarkerIcon}
                      />
                    )}
                  </MapContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

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
