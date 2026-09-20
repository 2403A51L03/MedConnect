export function DoctorCard({ doctor, selected, canManage = false, onSelect }) {
  const availabilityLabel = doctor.availability === 'BUSY' ? 'In consultation' : doctor.availability === 'UNAVAILABLE' ? 'Unavailable' : 'Available'
  const availabilityClass = doctor.availability === 'BUSY' ? 'busy' : doctor.availability === 'UNAVAILABLE' ? 'offline' : ''
  return (
    <article className={`doctor-card ${selected ? 'selected' : ''}`}>
      <div className="doctor-avatar" aria-hidden="true">{doctor.name.slice(0, 1)}</div>
      <div className="doctor-card-body">
        <div className="doctor-card-heading">
          <div>
            <h3>{doctor.name}</h3>
            <p>{doctor.specialization || 'General medicine'}</p>
          </div>
          <span className={`availability ${availabilityClass}`}><span /> {availabilityLabel}</span>
        </div>
        <p className="doctor-contact">{doctor.email}</p>
        <button type="button" className="select-doctor" onClick={() => onSelect(doctor)} disabled={!doctor.isAvailable && !canManage}>
          {selected ? 'Selected' : canManage && !doctor.isAvailable ? 'Manage availability' : doctor.isAvailable ? 'View schedule' : 'Currently unavailable'}
        </button>
      </div>
    </article>
  )
}