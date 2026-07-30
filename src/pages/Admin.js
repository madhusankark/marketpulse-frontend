import { FiShield } from 'react-icons/fi';

export default function Admin() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1><FiShield size={22} /> Admin Portal</h1>
      </div>
      <p style={{ textAlign: 'center', marginTop: 48, color: '#94a3b8' }}>
        Admin features are only available on the local development server.
      </p>
    </div>
  );
}