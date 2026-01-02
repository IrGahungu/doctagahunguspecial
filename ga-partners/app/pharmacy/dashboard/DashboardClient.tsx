"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PharmacyApplication = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rejection_reason: string | null;
  image?: string | null;
};

interface DashboardClientProps {
  app: PharmacyApplication;
}

export default function DashboardClient({ app }: DashboardClientProps) {
  const [showStatus, setShowStatus] = useState(false);
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const statusColorMap = {
    pending: "text-yellow-500",
    approved: "text-green-500",
    rejected: "text-red-500",
  };

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/pharmacy/logout", { method: "POST" });
      router.refresh();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
      router.push("/login");
    }
  }

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    if (tab === "status") setShowStatus(true);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-20 md:w-64 bg-white shadow-lg p-4 md:p-6 flex flex-col space-y-4 border-r border-gray-200 overflow-y-auto transition-all duration-300">
        <div className="mb-6 flex flex-col items-center justify-center">
          <div className="h-10 w-10 md:h-20 md:w-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 shadow-sm mb-3 overflow-hidden transition-all duration-300">
            {app.image ? (
              <img src={app.image} alt={app.name} className="h-full w-full object-cover" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="text-sm text-gray-500 font-medium break-all text-center px-2 hidden md:block transition-opacity duration-300">{app.email}</div>
        </div>
        <div className="relative">
          <button
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition disabled:bg-blue-400"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="hidden md:block">Dashboard</span>
              </>
          </button>
          {activeTab === "dashboard" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition disabled:bg-green-400"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="hidden md:block">Orders</span>
              </>
          </button>
          {activeTab === "bookings" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-green-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition disabled:bg-teal-400"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span className="hidden md:block">Scan Bill</span>
              </>
          </button>
          {activeTab === "scan" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-teal-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition disabled:bg-orange-400"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:block">Availability</span>
              </>
          </button>
          {activeTab === "availability" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-orange-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition disabled:bg-indigo-400"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="hidden md:block">My pharmacy</span>
              </>
          </button>
          {activeTab === "profile" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-indigo-600 rounded-full"></div>}
        </div>

        <div className="relative">
          <button
            onClick={() => handleNavClick("status")}
            className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 disabled:bg-purple-400 transition"
          >
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden md:block">Status</span>
              </>
          </button>
          {activeTab === "status" && <div className="absolute top-1/2 -right-4 -translate-y-1/2 w-3 h-3 bg-purple-600 rounded-full"></div>}
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="relative w-full flex items-center justify-center md:justify-start px-2 md:px-4 py-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 md:mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden md:block">Logout</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-8 py-5">
          <h2 className="text-center text-xl font-semibold text-gray-800">
          Greetings and welcome dear {app.name} on Dr. Gahungu Platform.
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-8">

            {activeTab === "status" && showStatus && (
              <div className="flex flex-col items-center">
                <div className="text-center">
                  <p>
                    <strong>Status:</strong> <span className={`${statusColorMap[app.status]} font-bold`}>{app.status}</span>
                  </p>
                  <p><strong>Submitted:</strong> {new Date(app.created_at).toLocaleString()}</p>
                  {app.status === "pending" && (
                    <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-2xl">
                      <p className="font-bold">Under Review</p>
                      <p>Your application is currently being reviewed by our team.</p>
                    </div>
                  )}
                  {app.status === "approved" && (
                    <div className="mt-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-2xl">
                      <p className="font-bold">Approved</p>
                      <p>Congratulations! Your application has been approved.</p>
                    </div>
                  )}
                  {app.status === "rejected" && (
                    <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-2xl">
                      <p className="font-bold">Rejected</p>
                      <p>Unfortunately, your application was rejected. Reason: {app.rejection_reason || "No reason provided"}</p>
                      <button
                        onClick={() => {
                          setIsNavigating(true);
                          // navigate to the apply page with the application id so the form can prefill
                          router.push(`/apply/pharmacy?id=${app.id}`);
                        }}
                        disabled={isNavigating}
                        className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                      >
                        {isNavigating ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Loading Form...
                          </>
                        ) : (
                          "Edit and Resubmit Application"
                        )}
                      </button>

                    </div>
                  )}
                </div>
              </div>
            )}

            {showLogoutConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/10">
                <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Logout</h3>
                  <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:bg-red-400"
                    >
                      {isLoggingOut ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Logging out...
                        </>
                      ) : "Logout"}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}