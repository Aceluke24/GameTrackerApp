import './TitleBar.css';
export default function TitleBar() {
  return (
    <div className="titlebar">
      <div className="titlebar-drag-region" />
      <div className="titlebar-logo">
        <img className="titlebar-icon" src="/icons8-closed-treasure-chest-96.png" alt="" />
        <span className="titlebar-name">Game Vault</span>
      </div>
      <div className="titlebar-drag-region" />
    </div>
  );
}
