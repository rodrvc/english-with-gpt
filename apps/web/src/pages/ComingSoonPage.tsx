import { Link, useLocation } from 'react-router-dom';

const NAMES: Record<string, string> = { '/speaking': 'Speaking', '/listening': 'Listening', '/reading': 'Reading' };

export function ComingSoonPage() {
  const { pathname } = useLocation();
  const name = NAMES[pathname] ?? 'Este módulo';
  return (
    <main className="wrap coming-soon">
      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <div className="eyebrow">Próximamente</div>
        <h1>{name} aún no está disponible</h1>
        <p>Estamos construyendo este módulo. Mientras tanto, puedes practicar tu escritura.</p>
        <Link to="/writing" className="btn btn-primary" style={{ display: 'inline-block', textDecoration: 'none', marginTop: 8 }}>
          Ir a Writing →
        </Link>
      </div>
    </main>
  );
}
