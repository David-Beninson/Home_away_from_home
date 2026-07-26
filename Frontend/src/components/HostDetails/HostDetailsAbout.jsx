export default function HostDetailsAbout({ biography, tags }) {
  return (
    <>
      {/* About Section Box */}
      <div className="about-section-card">
        <h3 className="about-title">קצת עלינו</h3>
        <p className="about-biography">{biography}</p>
      </div>

      {/* Tags Pills */}
      <div className="about-tags-list">
        {tags.map((tag, idx) => (
          <span key={idx} className={tag.startsWith('#') ? "about-tag-pill vibe-tag-pill" : "about-tag-pill"}>
            {tag}
          </span>
        ))}
      </div>
    </>
  );
}
