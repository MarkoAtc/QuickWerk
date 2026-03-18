import { adminShell } from '../admin-shell';

export default function AdminHomePage() {
  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>{adminShell.appName}</h1>
      <p>Web-first admin and operations shell for provider review and support.</p>
    </main>
  );
}