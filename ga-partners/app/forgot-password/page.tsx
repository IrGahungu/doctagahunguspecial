"use client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Forgot Password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          <p className="text-gray-700 mb-6 text-lg">
            Please send an email to{" "}
            <a
              href="mailto:gahunguresetpassword@gmail.com"
              className="font-bold text-indigo-600"
            >
              gahunguresetpassword@gmail.com
            </a>{" "}
            using your registered email and wait for at least 5 mins for your
            password.
          </p>
          <p className="text-gray-600 mb-8">
            Thank you for using Dr. Gahungu App
          </p>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
