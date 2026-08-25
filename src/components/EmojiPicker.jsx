import './EmojiPicker.css';

const EMOJIS = [
  '🎮', '🕹️', '👾', '🎯', '🏆', '🥇', '🎖️', '🏅',
  '⭐', '🌟', '✨', '🔥', '💎', '👑', '🚀', '🎉',
  '📦', '📚', '🗂️', '🛒', '💰', '🎁', '🔖', '📌',
  '✅', '❌', '⏳', '⏱️', '🔄', '🔁', '⏸️', '▶️',
  '💀', '☠️', '😴', '🤔', '🙄', '😤', '🚫', '🛑',
  '❤️', '💜', '💙', '💚', '🧡', '💛', '🖤', '🤍',
  '♾️', '🧩', '🃏', '🎲', '🐉', '🧙', '⚔️', '🛡️',
];

export default function EmojiPicker({ position, onSelect, onClose }) {
  return (
    <>
      <div className="emoji-picker-scrim" onClick={onClose} />
      <div
        className="emoji-picker-anchor"
        style={{ top: position.top, bottom: position.bottom, left: position.left, maxHeight: position.maxHeight }}
      >
        <div className="emoji-picker">
          {EMOJIS.map(e => (
            <button type="button" key={e} className="emoji-picker-btn" onClick={() => onSelect(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
