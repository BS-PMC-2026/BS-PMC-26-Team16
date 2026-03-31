import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">Urban EV</h1>
        <div className="space-x-4">
          <Link href="/" className="text-gray-300 hover:text-white">
            Home
          </Link>
          <Link href="/map" className="text-gray-300 hover:text-white">
            Map
          </Link>
          <Link href="/login" className="text-gray-300 hover:text-white">
            Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-1 items-center justify-center text-center px-6">
        <div>
          <h2 className="text-5xl font-bold mb-6">
            Find EV Charging <span className="text-blue-500">Anywhere</span>
          </h2>

          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Discover nearby charging stations, check availability, and even share your home charger with others.
          </p>

          <Link
            href="/map"
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl text-lg font-semibold transition"
          >
            Open Map 🚗⚡
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm p-4 border-t border-gray-800">
        Urban EV © 2026
      </footer>
    </main>
  );
}