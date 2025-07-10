"use client";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, FirebaseError } from "firebase/auth";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import toast, { Toaster } from "react-hot-toast";
import { create } from "zustand";
import "./styles.css";

// Zustand store for incidents page state
type IncidentsState = {
  searchQuery: string;
  dateStart: string;
  dateEnd: string;
  incidentType: string;
  radius: number;
  incidents: Incident[];
  filteredIncidents: Incident[];
  menuOpen: boolean;
  filterPanelOpen: boolean;
  isLoading: boolean;
  setSearchQuery: (query: string) => void;
  setDateStart: (date: string) => void;
  setDateEnd: (date: string) => void;
  setIncidentType: (type: string) => void;
  setRadius: (radius: number) => void;
  setIncidents: (incidents: Incident[]) => void;
  setFilteredIncidents: (incidents: Incident[]) => void;
  toggleMenu: () => void;
  toggleFilterPanel: () => void;
  setIsLoading: (loading: boolean) => void;
  resetFilters: () => void;
};

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

const useIncidentsStore = create<IncidentsState>((set) => ({
  searchQuery: "",
  dateStart: "",
  dateEnd: "",
  incidentType: "",
  radius: 10,
  incidents: [],
  filteredIncidents: [],
  menuOpen: false,
  filterPanelOpen: false,
  isLoading: false,
  setSearchQuery: (searchQuery) =>
    set((state) => {
      const filtered = state.incidents.filter(
        (incident) =>
          incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          incident.userId.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { searchQuery, filteredIncidents: filtered };
    }),
  setDateStart: (dateStart) => set({ dateStart }),
  setDateEnd: (dateEnd) => set({ dateEnd }),
  setIncidentType: (incidentType) => set({ incidentType }),
  setRadius: (radius) => set({ radius }),
  setIncidents: (incidents) => set({ incidents, filteredIncidents: incidents }),
  setFilteredIncidents: (filteredIncidents) => set({ filteredIncidents }),
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
  toggleFilterPanel: () => set((state) => ({ filterPanelOpen: !state.filterPanelOpen })),
  setIsLoading: (isLoading) => set({ isLoading }),
  resetFilters: () =>
    set((state) => ({
      searchQuery: "",
      dateStart: "",
      dateEnd: "",
      incidentType: "",
      radius: 10,
      filteredIncidents: state.incidents,
    })),
}));

export default function IncidentsPage() {
  const router = useRouter();
  const {
    searchQuery,
    dateStart,
    dateEnd,
    incidentType,
    radius,
    incidents,
    filteredIncidents,
    menuOpen,
    filterPanelOpen,
    isLoading,
    setSearchQuery,
    setDateStart,
    setDateEnd,
    setIncidentType,
    setRadius,
    setIncidents,
    setFilteredIncidents,
    toggleMenu,
    toggleFilterPanel,
    setIsLoading,
    resetFilters,
  } = useIncidentsStore();

  // State for current location
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Check authentication and restrict access to emergencyservices@milsonresponse.com
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        toast.error("Please sign in to view incidents.");
        router.push("/sign-in");
        return;
      }

      // Restrict access to only emergencyservices@milsonresponse.com
      if (user.email !== "emergencyservices@milsonresponse.com") {
        toast.error("Access denied. Only authorized emergency services can view this page.");
        router.push("/sign-in");
        return;
      }

      setIsLoading(true);
      const toastId = toast.loading("Fetching incidents...");

      try {
        const incidentsQuery = query(
          collection(db, "incidents"),
          where("status", "==", "approved"),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(incidentsQuery);
        const incidentsData: Incident[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          console.log("Fetched incident:", data); // Debug log
          return {
            id: doc.id,
            userId: data.userId || "",
            description: data.description || "",
            photoUrls: data.photoUrls || [],
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            createdAt: data.createdAt ? data.createdAt.toDate() : null,
            status: data.status || "",
          };
        });

        console.log("Incidents data:", incidentsData); // Debug log
        setIncidents(incidentsData);
        toast.success(`Loaded ${incidentsData.length} approved incident(s)!`, { id: toastId });
      } catch (err: any) {
        console.error("Error fetching incidents:", err); // Debug log
        toast.error(handleFirebaseError(err), { id: toastId });
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, setIncidents, setIsLoading]);

  // Apply filters
  useEffect(() => {
    let filtered = [...incidents];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (incident) =>
          incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          incident.userId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Date range filter
    if (dateStart || dateEnd) {
      filtered = filtered.filter((incident) => {
        if (!incident.createdAt) return false;
        const incidentDate = incident.createdAt.getTime();
        const start = dateStart ? new Date(dateStart).getTime() : -Infinity;
        const end = dateEnd ? new Date(dateEnd).getTime() : Infinity;
        return incidentDate >= start && incidentDate <= end;
      });
    }

    // Incident type filter
    if (incidentType) {
      filtered = filtered.filter((incident) =>
        incident.description.toLowerCase().includes(incidentType.toLowerCase())
      );
    }

    // Location radius filter (only apply if location is set)
    if (latitude !== null && longitude !== null && radius) {
      filtered = filtered.filter((incident) => {
        if (!incident.latitude || !incident.longitude) return false;
        const distance = getDistance(
          latitude,
          longitude,
          incident.latitude,
          incident.longitude
        );
        return distance <= radius;
      });
    }

    setFilteredIncidents(filtered);
    if (filtered.length === 0 && incidents.length > 0) {
      //toast.error("No incidents match the current filters.");
    }
  }, [searchQuery, dateStart, dateEnd, incidentType, radius, incidents, latitude, longitude, setFilteredIncidents]);

  // Haversine formula for distance calculation (in km)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Map Firebase error codes
  const handleFirebaseError = (err: FirebaseError) => {
    switch (err.code) {
      case "permission-denied":
        return "You do not have permission to access incidents.";
      case "unavailable":
        return "Firestore is currently unavailable. Please try again later.";
      default:
        return err.message || "Failed to fetch incidents.";
    }
  };

  // Get current location for radius filter
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          toast.success("Current location retrieved for radius filter!");
        },
        (err) => {
          toast.error("Unable to retrieve location.");
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  return (
    <>
      <Head>
        <title>Milson Response - Approved Incidents</title>
        <meta
          name="description"
          content="These incidents are waiting for response"
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

      <section className="incidents">
        <div className="container">
          <h1>Emergency Services</h1>
          <p className="subtitle">These incidents are waiting for response.</p>

          <div className="filter-search-bar">
            <button className="cta-button secondary" onClick={toggleFilterPanel}>
              {filterPanelOpen ? "Hide Filters" : "Show Filters"}
            </button>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              disabled={isLoading}
            />
            {(searchQuery || dateStart || dateEnd || incidentType || (radius !== 10 && latitude && longitude)) && (
              <button className="cta-button secondary" onClick={resetFilters}>
                Clear Filters
              </button>
            )}
          </div>

          <div className={`filter-panel ${filterPanelOpen ? "open" : ""}`}>
            <div className="form-group">
              <label>Date Range</label>
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                disabled={isLoading}
              />
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label>Incident Type</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                disabled={isLoading}
              >
                <option value="">All Types</option>
                <option value="flood">Flood</option>
                <option value="fire">Fire</option>
                <option value="earthquake">Earthquake</option>
              </select>
            </div>
            <div className="form-group">
              <label>Location Radius (km)</label>
              <button
                type="button"
                className="cta-button secondary"
                onClick={handleCurrentLocation}
                disabled={isLoading}
              >
                Use Current Location
              </button>
              {latitude && longitude && (
                <p className="coordinates">
                  Center: Lat {latitude.toFixed(6)}, Lon {longitude.toFixed(6)}
                </p>
              )}
              <input
                type="number"
                min="1"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                placeholder="Radius in km"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="active-filters">
            {searchQuery && (
              <span className="filter-chip">
                Search: {searchQuery}
                <button onClick={() => setSearchQuery("")}>X</button>
              </span>
            )}
            {dateStart && (
              <span className="filter-chip">
                From: {dateStart}
                <button onClick={() => setDateStart("")}>X</button>
              </span>
            )}
            {dateEnd && (
              <span className="filter-chip">
                To: {dateEnd}
                <button onClick={() => setDateEnd("")}>X</button>
              </span>
            )}
            {incidentType && (
              <span className="filter-chip">
                Type: {incidentType}
                <button onClick={() => setIncidentType("")}>X</button>
              </span>
            )}
            {radius !== 10 && latitude && longitude && (
              <span className="filter-chip">
                Radius: {radius}km
                <button onClick={() => setRadius(10)}>X</button>
              </span>
            )}
          </div>

          {isLoading ? (
            <p>Loading incidents...</p>
          ) : filteredIncidents.length === 0 ? (
            <p>No approved incidents found.</p>
          ) : (
            <div className="incidents-grid">
              {filteredIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="incident-card"
                  onClick={() => router.push(`/emg-incident-details/${incident.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <p>{incident.description}</p>
                  <p className="coordinates">
                    Location: Lat {incident.latitude.toFixed(6)}, Lon {incident.longitude.toFixed(6)}
                  </p>
                  {incident.createdAt && (
                    <p>Reported: {incident.createdAt.toLocaleString()}</p>
                  )}
                  {incident.photoUrls.length > 0 && (
                    <div className="photo-preview">
                      {incident.photoUrls.map((url, index) => (
                        <Image
                          key={index}
                          src={url}
                          alt={`Incident photo ${index + 1}`}
                          width={100}
                          height={100}
                          className="photo-thumbnail"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}