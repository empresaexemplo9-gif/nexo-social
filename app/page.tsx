import Navbar from '../components/Navbar';
import BomDiaModule from '../components/BomDiaModule';
import EntertainmentHub from '../components/EntertainmentHub';
import TechAgenda from '../components/TechAgenda';

export default function Home() {
  return (
    <div>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <BomDiaModule />
        <EntertainmentHub />
        <TechAgenda />
      </main>
      <footer className="border-t border-zinc-900 py-8 text-center text-xs text-zinc-600">
        nexo-social / Agendrap — Curadoria de Entretenimento Premium
      </footer>
    </div>
  );
}
