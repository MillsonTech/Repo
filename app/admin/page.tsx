"use client";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, getDocs, updateDoc, doc, orderBy, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import toast, { Toaster } from "react-hot-toast";
import { create } from "zustand";
import "./styles.css";

// Interface for user document
interface User {
  displayName?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  uid: string;
}

// Interface for incident
interface Incident {
  id: string;
  userId: string;
  displayName: string;
  description: string;
  photoUrls: string[];
  latitude: number;
  longitude: number;
  createdAt: Date | null;
  status: string;
}

// Interface for donation
interface Donation {
  id: string;
  amount: number;
  email: string;
  incidentId: string;
  createdAt: Date | null;
  incidentDetails?: {
    description: string;
    latitude: number;
    longitude: number;
    status: string;
  };
}

// Zustand store for admin state
interface AdminState {
  searchQuery: string;
  incidents: Incident[];
  filteredIncidents: Incident[];
  donations: Donation[];
  filteredDonations: Donation[];
  users: User[];
  filteredUsers: User[];
  activeTab: string;
  isLoading: boolean;
  setSearchQuery: (query: string) => void;
  setIncidents: (incidents: Incident[]) => void;
  setFilteredIncidents: (incidents: Incident[]) => void;
  setDonations: (donations: Donation[]) => void;
  setFilteredDonations: (donations: Donation[]) => void;
  setUsers: (users: User[]) => void;
  setFilteredUsers: (users: User[]) => void;
  setActiveTab: (tab: string) => void;
  setIsLoading: (loading: boolean) => void;
  resetFilters: () => void;
}

const useAdminStore = create<AdminState>((set) => ({
  searchQuery: "",
  incidents: [],
  filteredIncidents: [],
  donations: [],
  filteredDonations: [],
  users: [],
  filteredUsers: [],
  activeTab: "incidents",
  isLoading: false,
  setSearchQuery: (searchQuery) =>
    set((state) => {
      const filteredIncidents = state.incidents.filter(
        (incident) =>
          incident.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          incident.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          incident.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      const filteredDonations = state.donations.filter(
        (donation) =>
          donation.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (donation.incidentDetails?.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
      const filteredUsers = state.users.filter(
        (user) =>
          (user.displayName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.email || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
      return { searchQuery, filteredIncidents, filteredDonations, filteredUsers };
    }),
  setIncidents: (incidents) => set({ incidents, filteredIncidents: incidents }),
  setFilteredIncidents: (filteredIncidents) => set({ filteredIncidents }),
  setDonations: (donations) => set({ donations, filteredDonations: donations }),
  setFilteredDonations: (filteredDonations) => set({ filteredDonations }),
  setUsers: (users) => set({ users, filteredUsers: users }),
  setFilteredUsers: (filteredUsers) => set({ filteredUsers }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setIsLoading: (isLoading) => set({ isLoading }),
  resetFilters: () =>
    set((state) => ({
      searchQuery: "",
      filteredIncidents: state.incidents,
      filteredDonations: state.donations,
      filteredUsers: state.users,
    })),
}));

export default function AdminPage() {
  const router = useRouter();
  const {
    searchQuery,
    incidents,
    filteredIncidents,
    donations,
    filteredDonations,
    users,
    filteredUsers,
    activeTab,
    isLoading,
    setSearchQuery,
    setIncidents,
    setFilteredIncidents,
    setDonations,
    setFilteredDonations,
    setUsers,
    setFilteredUsers,
    setActiveTab,
    setIsLoading,
    resetFilters,
  } = useAdminStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check authentication and admin status, fetch incidents, donations, and users
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === "admin@milsonresponse.com") {
        setIsAuthenticated(true);
        setIsAdmin(true);

        // Fetch incidents
        const fetchIncidents = async () => {
          setIsLoading(true);
          const toastId = toast.loading("Fetching incidents...");
          try {
            const incidentsQuery = query(collection(db, "incidents"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(incidentsQuery);
            const incidentsData: Incident[] = await Promise.all(
              querySnapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data();
                let displayName = "Unknown User";
                if (data.userId && typeof data.userId === "string") {
                  try {
                    const userDocRef = doc(db, "users", data.userId);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                      const userData = userDoc.data() as User;
                      displayName = userData.displayName || "Unknown User";
                    }
                  } catch (error) {
                    console.error(`Error fetching user data for userId: ${data.userId}`, error);
                  }
                }
                return {
                  id: docSnapshot.id,
                  userId: data.userId || "",
                  displayName,
                  description: data.description || "",
                  photoUrls: data.photoUrls || [],
                  latitude: data.latitude || 0,
                  longitude: data.longitude || 0,
                  createdAt: data.createdAt ? data.createdAt.toDate() : null,
                  status: data.status || "pending",
                };
              })
            );
            setIncidents(incidentsData);
            toast.success(`Loaded ${incidentsData.length} incident(s)!`, { id: toastId });
          } catch (err: any) {
            console.error("Error fetching incidents:", err);
            toast.error("Failed to fetch incidents.", { id: toastId });
          } finally {
            setIsLoading(false);
          }
        };

        // Fetch donations with incident details
        const fetchDonations = async () => {
          try {
            const donationsQuery = query(collection(db, "donations"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(donationsQuery);
            const donationsData: Donation[] = await Promise.all(
              querySnapshot.docs.map(async (docSnapshot) => {
                const data = docSnapshot.data();
                let incidentDetails: Donation["incidentDetails"] = undefined;
                if (data.incidentId) {
                  try {
                    const incidentDocRef = doc(db, "incidents", data.incidentId);
                    const incidentDoc = await getDoc(incidentDocRef);
                    if (incidentDoc.exists()) {
                      const incidentData = incidentDoc.data();
                      incidentDetails = {
                        description: incidentData.description || "",
                        latitude: incidentData.latitude || 0,
                        longitude: incidentData.longitude || 0,
                        status: incidentData.status || "pending",
                      };
                    }
                  } catch (error) {
                    console.error(`Error fetching incident data for incidentId: ${data.incidentId}`, error);
                  }
                }
                return {
                  id: docSnapshot.id,
                  amount: data.amount || 0,
                  email: data.email || "",
                  incidentId: data.incidentId || "",
                  createdAt: data.createdAt ? data.createdAt.toDate() : null,
                  incidentDetails,
                };
              })
            );
            setDonations(donationsData);
          } catch (err: any) {
            console.error("Error fetching donations:", err);
            toast.error("Failed to fetch donations.");
          }
        };

        // Fetch users
        const fetchUsers = async () => {
          try {
            const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(usersQuery);
            const usersData: User[] = querySnapshot.docs.map((docSnapshot) => {
              const data = docSnapshot.data();
              return {
                uid: docSnapshot.id,
                displayName: data.displayName || "Unknown User",
                email: data.email || "",
                role: data.role || "user",
                createdAt: data.createdAt || "",
              };
            });
            setUsers(usersData);
          } catch (err: any) {
            console.error("Error fetching users:", err);
            toast.error("Failed to fetch users.");
          }
        };

        fetchIncidents();
        fetchDonations();
        fetchUsers();
      } else {
        setIsAuthenticated(!!user);
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, [setIncidents, setDonations, setUsers, setIsLoading]);

  // Handle admin login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (email !== "admin@milsonresponse.com") {
        toast.error("Access denied. Only admin@milsonresponse.com is allowed.");
        await auth.signOut();
        return;
      }
      toast.success("Logged in successfully!");
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error("Invalid email or password.");
    }
  };

  // Handle approve/revoke incident
  const handleIncidentAction = async (incidentId: string, action: "approve" | "revoke") => {
    try {
      const incidentRef = doc(db, "incidents", incidentId);
      await updateDoc(incidentRef, { status: action === "approve" ? "approved" : "revoked" });
      toast.success(`Incident ${action}d successfully!`);

      setIncidents(
        incidents.map((incident) =>
          incident.id === incidentId ? { ...incident, status: action === "approve" ? "approved" : "revoked" } : incident
        )
      );
    } catch (err: any) {
      console.error(`Error ${action}ing incident:`, err);
      toast.error(`Failed to ${action} incident.`);
    }
  };

  // Handle image click to open modal
  const openImageModal = (url: string) => {
    setSelectedImage(url);
  };

  // Close modal
  const closeImageModal = () => {
    setSelectedImage(null);
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Render login form if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return (
      <>
        <Head>
          <title>Milson Response - Admin Login</title>
          <meta name="description" content="Admin login for Milson Response." />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

        <section className="admin-login">
          <div className="container">
            <h1>Admin Login</h1>
            <p className="subtitle">Sign in to access the admin panel.</p>
            <form onSubmit={handleLogin} className="login-form">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin email"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              <button type="submit" className="cta-button">
                Sign In
              </button>
            </form>
            <p>
              Not an admin? <Link href="/sign-in">Sign in as a user</Link>
            </p>
          </div>
        </section>
      </>
    );
  }

  // Render admin dashboard
  return (
    <>
      <Head>
        <title>Milson Response - Admin Panel</title>
        <meta name="description" content="Admin panel for managing incidents, donations, and users." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <header className="header">
        <div className="container">
          <button className="hamburger-menu" onClick={toggleSidebar}>
            ☰
          </button>
          <div className="logo">
            <Link href="/" className="logo-text">
              Milson Response
            </Link>
          </div>
          <nav className="nav">
            <ul>
              <li>
                <button onClick={() => auth.signOut()} className="cta-button">
                  Sign Out
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="admin-layout">
        {/* Sidebar Navigation */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <button className="close-sidebar" onClick={toggleSidebar}>
            ×
          </button>
          <h3>Admin Panel</h3>
          <nav>
            <ul>
              <li>
                <button
                  className={`sidebar-button ${activeTab === "incidents" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("incidents");
                    setIsSidebarOpen(false);
                  }}
                >
                  Incidents
                </button>
              </li>
              <li>
                <button
                  className={`sidebar-button ${activeTab === "donations" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("donations");
                    setIsSidebarOpen(false);
                  }}
                >
                  Donations
                </button>
              </li>
              <li>
                <button
                  className={`sidebar-button ${activeTab === "users" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("users");
                    setIsSidebarOpen(false);
                  }}
                >
                  Users
                </button>
              </li>
              <li>
                <button
                  className={`sidebar-button ${activeTab === "settings" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("settings");
                    setIsSidebarOpen(false);
                  }}
                >
                  Settings
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="admin-content">
          <div className="container">
            {activeTab === "incidents" && (
              <div className="tab-content">
                <h2>Incidents</h2>
                <div className="filter-search-bar">
                  <input
                    type="text"
                    placeholder="Search by description or user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                    disabled={isLoading}
                  />
                  {searchQuery && (
                    <button className="cta-button secondary" onClick={resetFilters}>
                      Clear Search
                    </button>
                  )}
                </div>

                {isLoading ? (
                  <p>Loading incidents...</p>
                ) : filteredIncidents.length === 0 ? (
                  <p>No incidents found.</p>
                ) : (
                  <div className="incidents-grid">
                    {filteredIncidents.map((incident) => (
                      <div key={incident.id} className="incident-card">
                        <p>{incident.description}</p>
                        <p className="user-name">Reported by: {incident.displayName}</p>
                        <p className="coordinates">
                          Location: Lat {incident.latitude.toFixed(6)}, Lon {incident.longitude.toFixed(6)}
                        </p>
                        {incident.createdAt && (
                          <p>Reported: {incident.createdAt.toLocaleString()}</p>
                        )}
                        <p>
                          Status: {incident.status.toLowerCase() === "approved" ? "Ongoing" : incident.status}
                        </p>
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
                                onClick={() => openImageModal(url)}
                              />
                            ))}
                          </div>
                        )}
                        <div className="incident-actions">
                          {incident.status !== "approved" && (
                            <button
                              className="cta-button approve"
                              onClick={() => handleIncidentAction(incident.id, "approve")}
                            >
                              Approve
                            </button>
                          )}
                          {incident.status !== "revoked" && (
                            <button
                              className="cta-button revoke"
                              onClick={() => handleIncidentAction(incident.id, "revoke")}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "donations" && (
              <div className="tab-content">
                <h2>Donations</h2>
                <div className="filter-search-bar">
                  <input
                    type="text"
                    placeholder="Search by email or incident description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                    disabled={isLoading}
                  />
                  {searchQuery && (
                    <button className="cta-button secondary" onClick={resetFilters}>
                      Clear Search
                    </button>
                  )}
                </div>

                {isLoading ? (
                  <p>Loading donations...</p>
                ) : filteredDonations.length === 0 ? (
                  <p>No donations found.</p>
                ) : (
                  <div className="donations-grid">
                    {filteredDonations.map((donation) => (
                      <div key={donation.id} className="donation-card">
                        <p><strong>Amount:</strong> {donation.amount} NGN</p>
                        <p><strong>Donor Email:</strong> {donation.email}</p>
                        {donation.createdAt && (
                          <p><strong>Donated:</strong> {donation.createdAt.toLocaleString()}</p>
                        )}
                        {donation.incidentDetails ? (
                          <>
                            <p><strong>Incident:</strong> {donation.incidentDetails.description}</p>
                            <p className="coordinates">
                              <strong>Location:</strong> Lat {donation.incidentDetails.latitude.toFixed(6)}, Lon{" "}
                              {donation.incidentDetails.longitude.toFixed(6)}
                            </p>
                            <p>
                              <strong>Incident Status:</strong>{" "}
                              {donation.incidentDetails.status.toLowerCase() === "approved"
                                ? "Ongoing"
                                : donation.incidentDetails.status}
                            </p>
                          </>
                        ) : (
                          <p><strong>Incident:</strong> Not found (ID: {donation.incidentId})</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "users" && (
              <div className="tab-content">
                <h2>Users</h2>
                <div className="filter-search-bar">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                    disabled={isLoading}
                  />
                  {searchQuery && (
                    <button className="cta-button secondary" onClick={resetFilters}>
                      Clear Search
                    </button>
                  )}
                </div>

                {isLoading ? (
                  <p>Loading users...</p>
                ) : filteredUsers.length === 0 ? (
                  <p>No users found.</p>
                ) : (
                  <div className="users-grid">
                    {filteredUsers.map((user) => (
                      <div key={user.uid} className="user-card">
                        <p><strong>Name:</strong> {user.displayName}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        <p><strong>Role:</strong> {user.role}</p>
                        <p><strong>UID:</strong> {user.uid}</p>
                        {user.createdAt && (
                          <p><strong>Joined:</strong> {new Date(user.createdAt).toLocaleString()}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="tab-content">
                <h2>Settings</h2>
                <p>Admin settings will be implemented here.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="image-modal-content">
            <button className="close-modal" onClick={closeImageModal}>
              ×
            </button>
            <Image
              src={selectedImage}
              alt="Full-size incident photo"
              layout="fill"
              objectFit="contain"
            />
          </div>
        </div>
      )}
    </>
  );
}