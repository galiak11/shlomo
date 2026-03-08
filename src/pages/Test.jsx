export default function Test() {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>It works!</h1>
      <p>Tailscale connection OK</p>
      <p>{new Date().toLocaleString()}</p>
    </div>
  );
}
