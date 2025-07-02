"use client";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { onAuthStateChanged, FirebaseError } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../lib/firebase";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import toast, { Toaster } from "react-hot-toast";
import {create} from "zustand"; // Import Zustand
import "leaflet/dist/leaflet.css";
import "leaflet-geosearch/dist/geosearch.css";
import "./styles.css";

// Custom marker icon (Leaflet requires this for Next.js due to SSR)
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
});

// Type assertion for GeoSearchControl to fix TypeScript error
const GeoSearchControlTyped = GeoSearchControl as any;

// Zustand store for report incident state
type ReportIncidentState = {
  description: string;
  photos: File[];
  latitude: number | null;
  longitude: number | null;
  useCurrentLocation: boolean;
  disclaimerChecked: boolean;
  isSubmitting: boolean;
  menuOpen: boolean;
  setDescription: (description: string) => void;
  addPhotos: (files: File[]) => void;
  removePhoto: (index: number) => void;
  setLatitude: (lat: number | null) => void;
  setLongitude: (lng: number | null) => void;
  setUseCurrentLocation: (value: boolean) => void;
  setDisclaimerChecked: (value: boolean) => void;
  setIsSubmitting: (value: boolean) => void;
  toggleMenu: () => void;
  resetForm: () => void;
};

const useReportIncidentStore = create<ReportIncidentState>((set) => ({
  description: "",
  photos: [],
  latitude: null,
  longitude: null,
  useCurrentLocation: false,
  disclaimerChecked: false,
  isSubmitting: false,
  menuOpen: false,
  setDescription: (description) => set({ description }),
  addPhotos: (files) =>
    set((state) => ({
      photos: [...state.photos, ...files].slice(0, 3), // Limit to 3 photos
    })),
  removePhoto: (index) =>
    set((state) => ({
      photos: state.photos.filter((_, i) => i !== index),
    })),
  setLatitude: (latitude) => set({ latitude }),
  setLongitude: (longitude) => set({ longitude }),
  setUseCurrentLocation: (useCurrentLocation) => set({ useCurrentLocation }),
  setDisclaimerChecked: (disclaimerChecked) => set({ disclaimerChecked }),
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
  toggleMenu: () => set((state) => ({ menuOpen: !state.menuOpen })),
  resetForm: () =>
    set({
      description: "",
      photos: [],
      latitude: null,
      longitude: null,
      useCurrentLocation: false,
      disclaimerChecked: false,
    }),
}));

// Search control component
const SearchControl = ({
  setLatitude,
  setLongitude,
  setUseCurrentLocation,
}: {
  setLatitude: (lat: number) => void;
  setLongitude: (lng: number) => void;
  setUseCurrentLocation: (value: boolean) => void;
}) => {
  const map = useMap();
  useEffect(() => {
    const searchControl = new GeoSearchControlTyped({
      provider: new OpenStreetMapProvider(),
      position: "topleft",
      autoComplete: true,
      autoCompleteDelay: 250,
      showMarker: false,
    });
    map.addControl(searchControl);

    map.on("geosearch/showlocation", (e: any) => {
      setLatitude(e.location.y);
      setLongitude(e.location.x);
      setUseCurrentLocation(false);
      map.setView([e.location.y, e.location.x], 15);
      toast.success("Location selected from search.");
    });

    return () => {
      map.removeControl(searchControl);
      map.off("geosearch/showlocation");
    };
  }, [map, setLatitude, setLongitude, setUseCurrentLocation]);
  return null;
};

export default function ReportIncident() {
  const router = useRouter();
  const {
    description,
    photos,
    latitude,
    longitude,
    useCurrentLocation,
    disclaimerChecked,
    isSubmitting,
    menuOpen,
    setDescription,
    addPhotos,
    removePhoto,
    setLatitude,
    setLongitude,
    setUseCurrentLocation,
    setDisclaimerChecked,
    setIsSubmitting,
    toggleMenu,
    resetForm,
  } = useReportIncidentStore();

  // Check authentication status and get initial location
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/sign-in");
      }
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setUseCurrentLocation(true);
          toast.success("Current location retrieved successfully!");
        },
        (err) => {
          toast.error(
            "Unable to retrieve location. Please select a location on the map or search for a place."
          );
          setLatitude(0);
          setLongitude(0);
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
      setLatitude(0);
      setLongitude(0);
    }

    return () => unsubscribe();
  }, [router, setLatitude, setLongitude, setUseCurrentLocation]);

  // Handle current location button click
  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setUseCurrentLocation(true);
          toast.success("Current location retrieved successfully!");
        },
        (err) => {
          toast.error(
            "Unable to retrieve location. Please select a location on the map or search for a place."
          );
        },
        { enableHighAccuracy: true }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  // Handle photo upload
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length + photos.length > 3) {
        toast.error("You can upload a maximum of 3 photos.");
        return;
      }
      addPhotos(files);
      toast.success(`${files.length} photo(s) selected.`);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disclaimerChecked) {
      toast.error("You must agree to the disclaimer.");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required.");
      return;
    }
    if (
      !latitude ||
      !longitude ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      toast.error(
        "Please select a valid location on the map, use your current location, or search for a place."
      );
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting incident report...");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated.");

      // Upload photos to Firebase Storage
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const storageRef = ref(
          storage,
          `incidents/${user.uid}/${photo.name}-${Date.now()}`
        );
        await uploadBytes(storageRef, photo);
        const url = await getDownloadURL(storageRef);
        photoUrls.push(url);
      }

      // Save incident to Firestore
      const incidentId = doc(db, "incidents", `${user.uid}-${Date.now()}`).id;
      await setDoc(doc(db, "incidents", incidentId), {
        userId: user.uid,
        description: description.trim(),
        photoUrls,
        latitude,
        longitude,
        createdAt: serverTimestamp(),
        status: "pending",
      });

      toast.success("Incident reported successfully!", { id: toastId });
      resetForm();
      setTimeout(() => router.push("/select-task"), 2000); // Redirect after 2 seconds
    } catch (err: any) {
      toast.error(handleFirebaseError(err), { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Map click handler component
  const MapClickHandler = () => {
    const map = useMap();
    useMapEvents({
      click(e) {
        setLatitude(e.latlng.lat);
        setLongitude(e.latlng.lng);
        setUseCurrentLocation(false);
        map.setView([e.latlng.lat, e.latlng.lng], 15);
        toast.success("Location selected on map.");
      },
    });
    if (latitude && longitude) {
      map.setView([latitude, longitude], 15);
    }
    return null;
  };

  // Map Firebase error codes to user-friendly messages
  const handleFirebaseError = (err: FirebaseError) => {
    switch (err.code) {
      case "storage/unauthorized":
        return "You do not have permission to upload photos.";
      case "storage/canceled":
        return "Photo upload was canceled.";
      case "storage/unknown":
        return "An error occurred while uploading photos.";
      default:
        return err.message || "Failed to submit incident.";
    }
  };

  return (
    <>
      <Head>
        <title>Milson Response - Report Incident</title>
        <meta
          name="description"
          content="Report a disaster incident with Milson Response, including description, photos, and precise location."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <section className="report-incident">
        <div className="container-full">
          <div className="report-grid">
            <div className="form-column">
              <h1>Report Incident</h1>
              <p className="subtitle">
                Provide accurate details to help emergency services respond
                effectively.
              </p>
              <form onSubmit={handleSubmit} className="report-form">
                <div className="form-group">
                  <label htmlFor="description">What’s Happening?</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    placeholder="Describe the incident (e.g., flood, fire, earthquake)"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="photos">Attach Photos (up to 3)</label>
                  <div className="file-input-wrapper">
                    <input
                      type="file"
                      id="photos"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="file-input"
                      disabled={isSubmitting}
                    />
                    <label htmlFor="photos" className="file-input-label">
                      Choose Photos
                    </label>
                  </div>
                  <div className="photo-preview">
                    {photos.map((photo, index) => (
                      <div key={index} className="photo-wrapper">
                        <Image
                          src={URL.createObjectURL(photo)}
                          alt={`Preview ${index + 1}`}
                          width={100}
                          height={100}
                          className="photo-thumbnail"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="remove-photo"
                          disabled={isSubmitting}
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <button
                    type="button"
                    onClick={handleCurrentLocation}
                    className="cta-button secondary"
                    disabled={useCurrentLocation || isSubmitting}
                  >
                    Use Your Current Location
                  </button>
                  {latitude && longitude && (
                    <p className="coordinates">
                      Selected: Latitude {latitude.toFixed(6)}, Longitude{" "}
                      {longitude.toFixed(6)}
                    </p>
                  )}
                </div>
                <div className="form-group disclaimer">
                  <input
                    type="checkbox"
                    id="disclaimer"
                    checked={disclaimerChecked}
                    onChange={(e) => setDisclaimerChecked(e.target.checked)}
                    required
                    disabled={isSubmitting}
                  />
                  <label htmlFor="disclaimer">
                    I confirm that the information provided is accurate and
                    correct to the best of my knowledge.
                  </label>
                </div>
                <button
                  type="submit"
                  className="cta-button primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </button>
              </form>
            </div>
            <div className="map-column">
              <div className="map-container">
                <MapContainer
                  center={[latitude || 0, longitude || 0]}
                  zoom={latitude && longitude ? 15 : 2}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <MapClickHandler />
                  <SearchControl
                    setLatitude={setLatitude}
                    setLongitude={setLongitude}
                    setUseCurrentLocation={setUseCurrentLocation}
                  />
                  {latitude && longitude && (
                    <Marker position={[latitude, longitude]} icon={markerIcon} />
                  )}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}