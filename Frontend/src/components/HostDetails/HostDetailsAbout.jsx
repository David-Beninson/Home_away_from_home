import { useTranslation } from 'react-i18next';

export default function HostDetailsAbout({ biography, tags }) {
  const { t } = useTranslation(['guest/host_details']);
  return (
    <>
      {/* About Section Box */}
      <div className="about-section-card">
        <h3 className="about-title">{t('guest/host_details:about.title')}</h3>
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
