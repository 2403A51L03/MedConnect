export function DoctorCard({ doctor, selected, onSelect }) {
  return (
    <article className={`doctor-card ${selected ? 'selected' : ''}`}>
      <div className="doctor-avatar" aria-hidden="true">{doctor.name.slice(0, 1)}</div>
      <div className="doctor-card-body">
        <div className="doctor-card-heading">
          <div>
            <h3>{doctor.name}</h3>
            <p>{doctor.specialization || 'General medicine'}</p>
          </div>
          <span className="availability"><span /> Available</span>
        </div>
        <p className="doctor-contact">{doctor.email}</p>
        <button type="button" className="select-doctor" onClick={() => onSelect(doctor)}>
          {selected ? 'Selected for booking' : 'Select doctor'}
        </button>
      </div>
    </article>
  )
}