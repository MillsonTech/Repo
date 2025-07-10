"use client";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { doc, getDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../../lib/firebase";
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
  emgStatus: string; // Changed from status to emgStatus
};

type ChatMessage = {
  id: string;
  senderEmail: string;
  senderName: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: "photo" | "video";
  createdAt: Date;
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

// Map emgStatus to display text and icons
const getStatusDisplay = (emgStatus: string) => {
  switch (emgStatus.toLowerCase()) {
    case "on the way":
      return {
        text: "Emergency services are on the way",
        icon: "🚑",
        className: "status-on-the-way",
      };
    case "arrived":
      return {
        text: "Emergency services have arrived",
        icon: "📍",
        className: "status-arrived",
      };
    case "completed":
      return {
        text: "Emergency services have completed this",
        icon: "✅",
        className: "status-completed",
      };
    default:
      return {
        text: "Awaiting emergency services",
        icon: "⏳",
        className: "status-approved",
      };
  }
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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const userEmail = auth.currentUser?.email || "";
  const senderName = userEmail === "emergencyservices@milsonresponse.com" ? "You" : auth.currentUser?.displayName || userEmail.split("@")[0];

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
          emgStatus: data.emgStatus || "approved", // Use emgStatus
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

  // Fetch chat messages in real-time
  useEffect(() => {
    if (!id || !chatOpen) return;

    const chatsQuery = query(
      collection(db, "incidents", id as string, "chats"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const messages: ChatMessage[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        senderEmail: doc.data().senderEmail,
        senderName: doc.data().senderName,
        text: doc.data().text,
        mediaUrl: doc.data().mediaUrl,
        mediaType: doc.data().mediaType,
        createdAt: doc.data().createdAt.toDate(),
      }));
      setChatMessages(messages);
    }, (error) => {
      toast.error("Failed to load chat messages.");
      console.error("Error fetching chats:", error);
    });

    return () => unsubscribe();
  }, [id, chatOpen]);

  // Scroll to the bottom of the chat when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

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

  // Handle status update
  const handleStatusUpdate = async (newStatus: string) => {
    if (!incident?.id) return;

    const toastId = toast.loading("Updating status...");
    try {
      await updateDoc(doc(db, "incidents", incident.id), {
        emgStatus: newStatus, // Update emgStatus
      });
      setIncident((prev) => (prev ? { ...prev, emgStatus: newStatus } : null));
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

  // Handle chat modal toggle
  const toggleChat = () => {
    setChatOpen(!chatOpen);
  };

  // Close chat or photo modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (chatOpen) {
          setChatOpen(false);
        } else {
          closePhoto();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chatOpen, closePhoto]);

  // Handle sending a new message
const handleSendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!incident || !userEmail || (!newMessage.trim() && !mediaFile)) return;
  if (incident.emgStatus.toLowerCase() === "completed") {
    toast.error("Cannot send messages for completed incidents.");
    return;
  }

  setIsSending(true);
  const toastId = toast.loading("Sending message...");

  try {
    // Initialize the document data with required fields
    const docData: {
      senderEmail: string;
      senderName: string;
      text?: string;
      mediaUrl?: string;
      mediaType?: "photo" | "video";
      createdAt: Date;
    } = {
      senderEmail: userEmail,
      senderName,
      createdAt: new Date(),
    };

    // Add text if provided
    if (newMessage.trim()) {
      docData.text = newMessage.trim();
    }

    // Handle media file upload if provided
    if (mediaFile) {
      const fileRef = ref(storage, `chats/${id}/${Date.now()}_${mediaFile.name}`);
      await uploadBytes(fileRef, mediaFile);
      docData.mediaUrl = await getDownloadURL(fileRef);
      docData.mediaType = mediaFile.type.startsWith("video/") ? "video" : "photo";
    }

    await addDoc(collection(db, "incidents", id as string, "chats"), docData);

    toast.success("Message sent!", { id: toastId });
    setNewMessage("");
    setMediaFile(null);
  } catch (error) {
    toast.error("Failed to send message.", { id: toastId });
    console.error("Error sending message:", error);
  } finally {
    setIsSending(false);
  }
};

  // Handle media file selection
  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error("File size exceeds 10MB limit.");
        return;
      }
      setMediaFile(file);
    }
  };

  // Redirect to login if user is not authenticated
  if (!userEmail) {
    toast.error("Please log in to view incident details.");
    router.push("/sign-in");
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

  const { text, icon, className } = getStatusDisplay(incident.emgStatus);

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
                <p className={`status-display ${className}`}>
                  <span className="status-icon">{icon}</span> {text}
                </p>
                <button
                  className="cta-button primary navigate-button"
                  onClick={handleNavigateToLocation}
                >
                  Navigate to Location
                </button>
                <button
                  className="cta-button secondary chat-button"
                  onClick={toggleChat}
                >
                  {chatOpen ? "Close Chat" : "Open Chat"}
                </button>
                <div className="status-update-section">
                  <h3>Update Incident Status</h3>
                  <div className="status-buttons">
                    <button
                      className="cta-button secondary"
                      onClick={() => handleStatusUpdate("On the Way")}
                      disabled={
                        incident.emgStatus === "On the Way" ||
                        incident.emgStatus === "Arrived" ||
                        incident.emgStatus === "Completed"
                      }
                    >
                      On the Way
                    </button>
                    <button
                      className="cta-button secondary"
                      onClick={() => handleStatusUpdate("Arrived")}
                      disabled={
                        incident.emgStatus === "Arrived" ||
                        incident.emgStatus === "Completed"
                      }
                    >
                      Arrived
                    </button>
                    <button
                      className="cta-button secondary"
                      onClick={() => handleStatusUpdate("Completed")}
                      disabled={incident.emgStatus === "Completed"}
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
                        position={[userLocation.latitude, userLocation.longitude]}
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

      {chatOpen && (
        <div className="chat-modal" onClick={toggleChat}>
          <div className="chat-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={toggleChat}>
              ×
            </button>
            <div className="chat-header">
              <h2>Incident Chat</h2>
            </div>
            <div className="chat-messages" ref={chatContainerRef}>
              {chatMessages.length === 0 ? (
                <p className="no-messages">No messages yet.</p>
              ) : (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-bubble ${
                      message.senderEmail === userEmail ? "sent" : "received"
                    }`}
                  >
                    <div className="chat-bubble-header">
                      <span className="sender-name">{message.senderName}</span>
                      <span className="timestamp">
                        {message.createdAt.toLocaleString()}
                      </span>
                    </div>
                    {message.text && <p>{message.text}</p>}
                    {message.mediaUrl && message.mediaType === "photo" && (
                      <div className="chat-media">
                        <Image
                          src={message.mediaUrl}
                          alt="Chat photo"
                          width={200}
                          height={200}
                          className="chat-photo"
                          onClick={() => openPhoto(message.mediaUrl)}
                        />
                      </div>
                    )}
                    {message.mediaUrl && message.mediaType === "video" && (
                      <div className="chat-media">
                        <video
                          src={message.mediaUrl}
                          controls
                          className="chat-video"
                          style={{ maxWidth: "200px", maxHeight: "200px" }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            {incident.emgStatus.toLowerCase() !== "completed" ? (
              <form className="chat-form" onSubmit={handleSendMessage}>
                <div className="chat-input-group">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={isSending}
                  />
                  <label className="media-upload-label">
                    <span>📎</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleMediaChange}
                      disabled={isSending}
                      style={{ display: "none" }}
                    />
                  </label>
                  <button
                    type="submit"
                    className="cta-button primary"
                    disabled={isSending || (!newMessage.trim() && !mediaFile)}
                  >
                    Send
                  </button>
                </div>
                {mediaFile && (
                  <p className="media-preview">Selected: {mediaFile.name}</p>
                )}
              </form>
            ) : (
              <p className="chat-disabled">
                Messaging is disabled for completed incidents.
              </p>
            )}
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