import Navbar from '@/components/navigation/Navbar';
import Footer from '@/components/navigation/Footer';
import { HomeControlsProvider } from '@/contexts/HomeControlsContext';

export default function Layout({ children }) {
  return (
    <HomeControlsProvider>
      <div dir="rtl" className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </div>
    </HomeControlsProvider>
  );
}
