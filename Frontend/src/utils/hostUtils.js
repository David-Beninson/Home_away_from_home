export function mapHostData(found, t = (k) => k) {
  if (!found) return null;
  
  return {
    id: found.id,
    user_id: found.user_id,
    full_name: found.host_name || found.user?.full_name || '',
    city: found.city || '',
    neighborhood: found.neighborhood || '',
    kashrut_level: found.kashrut_level || '',
    religious_orientation: found.religious_orientation || '',
    has_lodging: found.has_lodging !== undefined
      ? found.has_lodging
      : Boolean(found.availability_windows?.includes('לינה')),
    available_spots: found.available_spots !== undefined ? found.available_spots : 0,
    total_spots: found.total_spots || found.max_guests || 0,
    match_percentage:
      found.match_score !== undefined && found.match_score !== null
        ? found.match_score
        : (found.match_percentage ?? 85),
    biography: found.free_text_notes || found.biography || '',
    tags: found.vibe_tags?.length ? found.vibe_tags : [
      found.neighborhood,
      found.religious_orientation,
      found.kashrut_level ? (found.kashrut_level === 'MEHADRIN' ? t('guest/host_details:page.kashrut.mehadrin') : t('guest/host_details:page.kashrut.kosher')) : ''
    ].filter(Boolean),
    image_url: found.image_url || null,
    rating: found.rating || null,
    reviews_count: found.reviews_count || found.review_count || 0,
    phone_number: found.phone_number || found.user?.phone_number || '',
    shabbat_date: found.shabbat_date || found.requested_date || found.available_date || null,
    upcoming_open_dates: found.upcoming_open_dates || [],
    upcoming_open_days: found.upcoming_open_days || []
  };
}
