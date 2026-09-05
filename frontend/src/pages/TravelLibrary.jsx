import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTOS = 8;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const emptyForm = { destination: "", tripDate: "", rating: 0, reviewText: "" };

export default function TravelLibrary() {
  const [memories, setMemories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [pickerError, setPickerError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/library/mine")
      .then((response) => {
        if (!cancelled) setMemories(response.data);
      })
      .catch((error) => {
        if (!cancelled) setPageError(getApiError(error, "Could not load your travel library."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredMemories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return memories;

    return memories.filter((memory) =>
      `${memory.destination || ""} ${memory.reviewText || ""}`.toLowerCase().includes(normalized)
    );
  }, [memories, query]);

  const photoCount = useMemo(
    () => memories.reduce((total, memory) => total + (memory.images?.length || 0), 0),
    [memories]
  );

  const today = new Date().toISOString().slice(0, 10);

  function scrollToForm() {
    requestAnimationFrame(() => {
      document.getElementById("travel-memory-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function resetForm() {
    setForm(emptyForm);
    setEditing(null);
    setExistingImages([]);
    setNewFiles([]);
    setFormError("");
    setPickerError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function beginCreate() {
    resetForm();
    scrollToForm();
  }

  function beginEdit(memory) {
    const fallbackDate = memory.createdAt ? new Date(memory.createdAt) : new Date();
    const dateValue = memory.tripDate
      ? new Date(memory.tripDate).toISOString().slice(0, 10)
      : fallbackDate.toISOString().slice(0, 10);

    setEditing(memory);
    setForm({
      destination: memory.destination || "",
      tripDate: dateValue,
      rating: Number(memory.rating) || 0,
      reviewText: memory.reviewText || "",
    });
    setExistingImages(memory.images || []);
    setNewFiles([]);
    setFormError("");
    setPickerError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    scrollToForm();
  }

  function addFiles(incomingFiles) {
    setPickerError("");

    const validFiles = [];
    let skippedInvalid = false;

    incomingFiles.forEach((file) => {
      if (!ACCEPTED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE) {
        skippedInvalid = true;
        return;
      }

      const duplicate = newFiles.some(
        (current) =>
          current.name === file.name &&
          current.size === file.size &&
          current.lastModified === file.lastModified
      );

      if (!duplicate) validFiles.push(file);
    });

    const availableSlots = MAX_PHOTOS - existingImages.length - newFiles.length;
    const accepted = validFiles.slice(0, Math.max(0, availableSlots));

    setNewFiles((current) => [...current, ...accepted]);

    if (validFiles.length > availableSlots) {
      setPickerError(`A memory can contain up to ${MAX_PHOTOS} photos.`);
    } else if (skippedInvalid) {
      setPickerError("Some files were skipped. Use JPG, PNG, or WebP images up to 10 MB each.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const destination = form.destination.trim();
    const reviewText = form.reviewText.trim();
    const totalPhotos = existingImages.length + newFiles.length;

    if (!destination || !form.tripDate || !reviewText || !form.rating) {
      setFormError("Complete every field and choose a star rating.");
      return;
    }
    if (totalPhotos === 0) {
      setFormError("Add at least one travel photo.");
      return;
    }
    if (totalPhotos > MAX_PHOTOS) {
      setFormError(`A memory can contain up to ${MAX_PHOTOS} photos.`);
      return;
    }

    setSaving(true);
    setFormError("");
    setPageError("");

    try {
      const data = new FormData();
      data.append("destination", destination);
      data.append("tripDate", form.tripDate);
      data.append("rating", String(form.rating));
      data.append("reviewText", reviewText);
      newFiles.forEach((file) => data.append("images", file));
      existingImages.forEach((image) => data.append("keepImageIds", image._id));

      if (editing) {
        const response = await api.put(`/library/${editing._id}`, data);
        setMemories((current) =>
          current.map((memory) => (memory._id === response.data._id ? response.data : memory))
        );
      } else {
        const response = await api.post("/library", data);
        setMemories((current) => [response.data, ...current]);
      }

      resetForm();
    } catch (error) {
      setFormError(getApiError(error, "Could not save this travel memory."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setDeleting(true);
    setPageError("");

    try {
      await api.delete(`/library/${deleteTarget._id}`);
      setMemories((current) => current.filter((memory) => memory._id !== deleteTarget._id));
      if (editing?._id === deleteTarget._id) resetForm();
      setDeleteTarget(null);
    } catch (error) {
      setDeleteTarget(null);
      setPageError(getApiError(error, "Could not delete this travel memory."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="tl-page">
      <style>{travelLibraryStyles}</style>

      <section className="tl-hero">
        <div className="tl-hero-copy">
          <p className="tl-eyebrow">MY TRAVEL LIBRARY</p>
          <h1>
            Keep the places
            <br className="tl-desktop-break" /> that changed you.
          </h1>
          <p className="tl-hero-text">
            Save the moments, photos, and stories from your trips so you can relive them anytime.
          </p>
          <button type="button" className="tl-primary-button" onClick={beginCreate}>
            Add a memory <PlusIcon />
          </button>
        </div>

        <div className="tl-summary-panel" aria-label="Travel library summary">
          <SummaryItem icon={<LibraryIcon />} number={memories.length} label="memories" />
          <div className="tl-summary-divider" aria-hidden="true" />
          <SummaryItem icon={<ImagesIcon />} number={photoCount} label="photos" />
        </div>
      </section>

      {pageError ? <div className="tl-page-error">{pageError}</div> : null}

      <div className="tl-workspace">
        <section id="travel-memory-form" className="tl-form-panel" aria-labelledby="travel-memory-form-title">
          <div className="tl-panel-heading">
            <div>
              <p className="tl-eyebrow tl-eyebrow-form">{editing ? "UPDATING MEMORY" : "A NEW CHAPTER"}</p>
              <h2 id="travel-memory-form-title">{editing ? "Edit your memory" : "Create a memory"}</h2>
            </div>

            {editing ? (
              <button type="button" className="tl-icon-button" onClick={resetForm} aria-label="Close edit form">
                <CloseIcon />
              </button>
            ) : null}
          </div>

          <form className="tl-form" onSubmit={handleSubmit}>
            <div className="tl-two-fields">
              <Field label="Destination">
                <input
                  value={form.destination}
                  onChange={(event) => setForm((current) => ({ ...current, destination: event.target.value }))}
                  placeholder="e.g. Cox's Bazar, Bangladesh"
                  maxLength={120}
                />
              </Field>

              <Field label="Trip date">
                <input
                  type="date"
                  value={form.tripDate}
                  max={today}
                  onChange={(event) => setForm((current) => ({ ...current, tripDate: event.target.value }))}
                />
              </Field>
            </div>

            <Field label="Rating">
              <Stars
                value={form.rating}
                onChange={(rating) => setForm((current) => ({ ...current, rating }))}
              />
            </Field>

            <Field label="Review">
              <textarea
                rows={4}
                value={form.reviewText}
                onChange={(event) => setForm((current) => ({ ...current, reviewText: event.target.value }))}
                placeholder="What made this trip worth remembering?"
                maxLength={2000}
              />
              <span className="tl-character-count">{form.reviewText.length}/2000</span>
            </Field>

            <Field label="Photos">
              <div>
                <button
                  type="button"
                  className={`tl-upload-zone ${dragging ? "tl-upload-zone-active" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setDragging(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    addFiles(Array.from(event.dataTransfer.files || []));
                  }}
                >
                  <ImagePlusIcon />
                  <span className="tl-upload-title">Drag and drop photos here</span>
                  <span className="tl-upload-help">or click to browse · JPG, PNG, WebP · max 10 MB each</span>
                </button>

                <input
                  ref={fileInputRef}
                  className="tl-hidden-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => {
                    addFiles(Array.from(event.target.files || []));
                    event.target.value = "";
                  }}
                />

                {pickerError ? <p className="tl-picker-error">{pickerError}</p> : null}

                {existingImages.length + newFiles.length > 0 ? (
                  <div className="tl-photo-previews">
                    {existingImages.map((image) => (
                      <PhotoThumbnail
                        key={image._id}
                        src={imageUrl(image)}
                        alt={editing?.destination || "Travel memory"}
                        onRemove={() => {
                          setExistingImages((current) =>
                            current.filter((currentImage) => currentImage._id !== image._id)
                          );
                          setPickerError("");
                        }}
                      />
                    ))}

                    {newFiles.map((file, index) => (
                      <NewFileThumbnail
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        file={file}
                        onRemove={() => {
                          setNewFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
                          setPickerError("");
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </Field>

            {formError ? <div className="tl-form-error">{formError}</div> : null}

            <div className="tl-form-actions">
              <button type="submit" className="tl-primary-button" disabled={saving}>
                {saving ? <SpinnerIcon /> : null}
                {saving ? "Saving…" : editing ? "Update memory" : "Save memory"}
              </button>

              {editing ? (
                <button type="button" className="tl-secondary-button" onClick={resetForm} disabled={saving}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="tl-memories-section" aria-labelledby="travel-memories-title">
          <div className="tl-list-heading">
            <div>
              <h2 id="travel-memories-title">Your memories</h2>
              <p>
                {filteredMemories.length} saved {filteredMemories.length === 1 ? "story" : "stories"}
              </p>
            </div>

            <label className="tl-search-field">
              <SearchIcon />
              <span className="tl-sr-only">Search memories</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search your memories…"
              />
            </label>
          </div>

          {loading ? (
            <div className="tl-empty-state">Loading your travel library…</div>
          ) : filteredMemories.length > 0 ? (
            <div className="tl-memory-grid">
              {filteredMemories.map((memory) => (
                <MemoryCard
                  key={memory._id}
                  memory={memory}
                  onEdit={() => beginEdit(memory)}
                  onDelete={() => setDeleteTarget(memory)}
                />
              ))}
            </div>
          ) : (
            <div className="tl-empty-state">
              <LibraryIcon large />
              <h3>{query ? "No memories found" : "Your first story starts here"}</h3>
              <p>
                {query
                  ? "Try a different destination or word."
                  : "Add photos and a short review from a trip you loved."}
              </p>
            </div>
          )}
        </section>
      </div>

      {deleteTarget ? (
        <div
          className="tl-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleting) setDeleteTarget(null);
          }}
        >
          <section className="tl-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-memory-title">
            <button
              className="tl-icon-button tl-dialog-close"
              type="button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
              aria-label="Close delete dialog"
            >
              <CloseIcon />
            </button>

            <div className="tl-alert-icon"><AlertIcon /></div>
            <h2 id="delete-memory-title">Delete this memory?</h2>
            <p>
              “{deleteTarget.destination}” and its {deleteTarget.images?.length || 0} photo
              {(deleteTarget.images?.length || 0) === 1 ? "" : "s"} will be permanently removed.
            </p>

            <div className="tl-dialog-actions">
              <button
                type="button"
                className="tl-secondary-button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Keep memory
              </button>
              <button type="button" className="tl-danger-button" onClick={confirmDelete} disabled={deleting}>
                {deleting ? <SpinnerIcon /> : <TrashIcon />}
                {deleting ? "Deleting…" : "Delete memory"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function SummaryItem({ icon, number, label }) {
  return (
    <div className="tl-summary-item">
      <span className="tl-summary-icon">{icon}</span>
      <strong>{number}</strong>
      <span>{label}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="tl-field">
      <span className="tl-field-label">{label}</span>
      {children}
    </label>
  );
}

function Stars({ value, onChange }) {
  return (
    <div className="tl-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) =>
        onChange ? (
          <button
            key={star}
            type="button"
            className={`tl-star-button ${star <= value ? "tl-star-active" : ""}`}
            onClick={() => onChange(star)}
            aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
          >
            ★
          </button>
        ) : (
          <span key={star} className={`tl-star ${star <= value ? "tl-star-active" : ""}`}>★</span>
        )
      )}
    </div>
  );
}

function NewFileThumbnail({ file, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return <PhotoThumbnail src={previewUrl} alt={file.name} onRemove={onRemove} />;
}

function PhotoThumbnail({ src, alt, onRemove }) {
  return (
    <div className="tl-photo-thumb">
      <img src={src} alt={alt} />
      <button type="button" onClick={onRemove} aria-label={`Remove ${alt}`}>
        <CloseIcon />
      </button>
    </div>
  );
}

function MemoryCard({ memory, onEdit, onDelete }) {
  const tripDate = memory.tripDate || memory.createdAt;
  const formattedDate = tripDate
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(tripDate))
    : "Date not available";

  const firstImage = memory.images?.[0];

  return (
    <article className="tl-memory-card">
      <div className="tl-card-image-wrap">
        {firstImage ? (
          <img className="tl-card-image" src={imageUrl(firstImage)} alt={memory.destination} />
        ) : (
          <div className="tl-card-image-placeholder"><ImagesIcon /></div>
        )}
        <span className="tl-photo-count"><ImagesIcon small /> {memory.images?.length || 0}</span>
      </div>

      <div className="tl-card-body">
        <h3>{memory.destination}</h3>
        <div className="tl-card-meta">
          <span><CalendarIcon /> {formattedDate}</span>
          <Stars value={Number(memory.rating) || 0} />
        </div>
        <p className="tl-review-text">{memory.reviewText}</p>

        <div className="tl-card-actions">
          <button type="button" className="tl-text-button tl-edit-button" onClick={onEdit}>
            <EditIcon /> Edit
          </button>
          <button type="button" className="tl-text-button tl-delete-button" onClick={onDelete}>
            <TrashIcon /> Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function imageUrl(image) {
  if (!image) return "";

  // Temporary compatibility with Module 1 filename strings.
  if (typeof image === "string") {
    if (/^https?:\/\//i.test(image)) return image;
    return `${API_ORIGIN}/uploads/${encodeURIComponent(image)}`;
  }

  // Module 2 Cloudinary image object.
  return image.url || "";
}

function getApiError(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function Svg({ children, size = 18, viewBox = "0 0 24 24", className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function PlusIcon() {
  return <Svg size={17}><path d="M12 5v14M5 12h14" /></Svg>;
}
function LibraryIcon({ large = false }) {
  return <Svg size={large ? 34 : 20}><path d="M4 19.5V4.8A1.8 1.8 0 0 1 5.8 3H19v16H6.2A2.2 2.2 0 0 0 4 21.2" /><path d="M4 18h15M8 7h7M8 11h6" /></Svg>;
}
function ImagesIcon({ small = false }) {
  return <Svg size={small ? 14 : 20}><rect x="3" y="5" width="14" height="14" rx="2" /><path d="m6 15 3.2-3.2 2.2 2.2 1.5-1.5 4.1 4.1" /><path d="M8 9h.01" /><path d="M7 2h12a2 2 0 0 1 2 2v12" /></Svg>;
}
function SearchIcon() {
  return <Svg size={17}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.7-3.7" /></Svg>;
}
function CalendarIcon() {
  return <Svg size={16}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></Svg>;
}
function EditIcon() {
  return <Svg size={16}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></Svg>;
}
function TrashIcon() {
  return <Svg size={16}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5" /></Svg>;
}
function ImagePlusIcon() {
  return <Svg size={28}><rect x="3" y="5" width="14" height="14" rx="2" /><path d="m5 16 3.5-3.5L11 15l2-2 4 4M8 9h.01M19 8v6M16 11h6" /></Svg>;
}
function CloseIcon() {
  return <Svg size={16}><path d="m6 6 12 12M18 6 6 18" /></Svg>;
}
function AlertIcon() {
  return <Svg size={21}><path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></Svg>;
}
function SpinnerIcon() {
  return (
    <svg className="tl-spinner" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const travelLibraryStyles = `
.tl-page {
  --tl-forest: #123925;
  --tl-ink: #222925;
  --tl-muted: #68716b;
  --tl-terracotta: #c4512d;
  --tl-terracotta-dark: #a94224;
  --tl-line: #d8ded5;
  --tl-sand: #fbf7f2;
  width: min(1380px, calc(100vw - 32px));
  margin-left: 50%;
  transform: translateX(-50%);
  padding: 28px 0 48px;
  color: var(--tl-ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.tl-page *, .tl-page *::before, .tl-page *::after { box-sizing: border-box; }
.tl-page h1, .tl-page h2, .tl-page h3 { color: var(--tl-forest); margin-top: 0; }
.tl-page h1, .tl-page h2, .tl-page h3 { font-family: Georgia, "Times New Roman", serif; }
.tl-page button, .tl-page input, .tl-page textarea { font: inherit; }
.tl-page button { width: auto; }

.tl-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  align-items: end;
  gap: 48px;
  padding: 18px 0 12px;
}
.tl-eyebrow {
  margin: 0 0 10px;
  color: var(--tl-terracotta);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.16em;
}
.tl-hero h1 {
  max-width: 760px;
  margin-bottom: 0;
  font-size: clamp(3rem, 5.5vw, 5rem);
  line-height: 0.98;
  letter-spacing: -0.035em;
  font-weight: 600;
}
.tl-hero-text {
  max-width: 630px;
  margin: 22px 0 0;
  color: var(--tl-muted);
  font-size: 1.08rem;
  line-height: 1.75;
}

.tl-primary-button, .tl-secondary-button, .tl-danger-button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  padding: 11px 18px;
  font-size: 0.9rem;
  font-weight: 700;
  transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
}
.tl-primary-button {
  margin-top: 24px;
  border: 1px solid #0f766e;
  background: #0f766e;
  color: #fff;
}
.tl-primary-button:hover { background: #0d5c56; transform: translateY(-1px); }
.tl-primary-button:disabled, .tl-secondary-button:disabled, .tl-danger-button:disabled { opacity: 0.62; cursor: not-allowed; transform: none; }
.tl-secondary-button { border: 1px solid #9aaa9d; background: #fff; color: var(--tl-forest); }
.tl-secondary-button:hover { border-color: var(--tl-forest); background: #fff; }
.tl-danger-button { border: 1px solid #b74225; background: #b74225; color: #fff; }
.tl-danger-button:hover { background: #99361e; }

.tl-summary-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #eadfd4;
  border-radius: 14px;
  background: linear-gradient(135deg, #fffdfb, var(--tl-sand));
  padding: 22px;
}
.tl-summary-item { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; }
.tl-summary-icon { margin-bottom: 2px; color: var(--tl-forest); }
.tl-summary-item strong { color: var(--tl-terracotta); font-family: Georgia, "Times New Roman", serif; font-size: 2.5rem; font-weight: 500; line-height: 1.05; }
.tl-summary-item > span:last-child { margin-top: 2px; color: var(--tl-ink); font-size: 0.88rem; font-weight: 650; }
.tl-summary-divider { width: 1px; height: 64px; background: var(--tl-line); }

.tl-page-error, .tl-form-error {
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 0.9rem;
  line-height: 1.45;
}
.tl-page-error { margin-top: 26px; padding: 12px 14px; }
.tl-form-error { padding: 10px 12px; }

.tl-workspace {
  display: grid;
  grid-template-columns: 430px minmax(0, 1fr);
  align-items: start;
  gap: 34px;
  margin-top: 48px;
}
.tl-form-panel {
  scroll-margin-top: 18px;
  border: 1px solid #cbd4c8;
  border-radius: 14px;
  padding: 22px;
  background: #fff;
}
.tl-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 21px; }
.tl-eyebrow-form { margin-bottom: 5px; }
.tl-panel-heading h2, .tl-list-heading h2 { margin-bottom: 0; font-size: 1.8rem; font-weight: 600; }
.tl-form { display: flex; max-width: none; flex-direction: column; gap: 17px; }
.tl-two-fields { display: grid; grid-template-columns: 1.35fr 0.9fr; gap: 15px; }
.tl-field { display: block; margin: 0; color: var(--tl-ink); font-size: 0.9rem; font-weight: 600; }
.tl-field-label { display: block; margin-bottom: 7px; }
.tl-form-panel input, .tl-form-panel textarea {
  width: 100%;
  border: 1px solid #cbd4c8;
  border-radius: 7px;
  background: #fff;
  padding: 11px 12px;
  color: var(--tl-ink);
  outline: none;
  font-size: 0.94rem;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.tl-form-panel textarea { min-height: 106px; resize: vertical; }
.tl-form-panel input:focus, .tl-form-panel textarea:focus {
  border-color: var(--tl-forest);
  box-shadow: 0 0 0 3px rgba(18, 57, 37, 0.1);
}
.tl-character-count { display: block; margin-top: 5px; text-align: right; color: var(--tl-muted); font-size: 0.74rem; font-weight: 500; }

.tl-stars { display: flex; gap: 2px; align-items: center; }
.tl-star-button {
  margin: 0;
  border: 0;
  border-radius: 4px;
  background: transparent !important;
  padding: 1px 2px;
  color: #a9b1aa;
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
  transition: color 130ms ease, transform 130ms ease;
}
.tl-star-button:hover { transform: scale(1.1); color: var(--tl-terracotta); }
.tl-star { color: #a9b1aa; font-size: 1.15rem; line-height: 1; }
.tl-star-active { color: var(--tl-terracotta) !important; }

.tl-upload-zone {
  display: flex;
  min-height: 132px;
  width: 100% !important;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px dashed #a9b5aa !important;
  border-radius: 10px !important;
  background: var(--tl-sand) !important;
  padding: 15px !important;
  color: var(--tl-forest) !important;
  text-align: center;
  transition: border-color 150ms ease, background-color 150ms ease;
}
.tl-upload-zone:hover, .tl-upload-zone-active { border-color: var(--tl-terracotta) !important; background: #fff7f3 !important; }
.tl-upload-title { color: var(--tl-ink); font-weight: 650; }
.tl-upload-help { color: var(--tl-muted); font-size: 0.78rem; font-weight: 500; }
.tl-hidden-file { display: none !important; }
.tl-picker-error { margin: 7px 0 0; color: #b91c1c; font-size: 0.8rem; font-weight: 500; }
.tl-photo-previews { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 11px; }
.tl-photo-thumb { position: relative; aspect-ratio: 1; overflow: hidden; border-radius: 8px; background: #eef1eb; }
.tl-photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
.tl-photo-thumb > button {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: rgba(255,255,255,0.96);
  padding: 0;
  color: var(--tl-forest);
  box-shadow: 0 2px 7px rgba(0,0,0,0.15);
}
.tl-photo-thumb > button:hover { background: #fff; }
.tl-form-actions { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 1px; }
.tl-form-actions .tl-primary-button { margin-top: 0; }

.tl-icon-button {
  display: grid;
  width: 34px !important;
  height: 34px;
  place-items: center;
  border: 1px solid var(--tl-line) !important;
  border-radius: 999px !important;
  background: #fff !important;
  padding: 0 !important;
  color: var(--tl-forest) !important;
}
.tl-icon-button:hover { border-color: var(--tl-forest) !important; }

.tl-list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}
.tl-list-heading p { margin: 5px 0 0; color: var(--tl-muted); font-size: 0.86rem; }
.tl-search-field {
  display: flex;
  min-width: min(100%, 280px);
  align-items: center;
  gap: 9px;
  border: 1px solid var(--tl-line);
  border-radius: 8px;
  padding: 9px 11px;
  color: var(--tl-muted);
  font-weight: 500;
}
.tl-search-field:focus-within { border-color: var(--tl-forest); box-shadow: 0 0 0 3px rgba(18,57,37,0.08); }
.tl-search-field input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  padding: 0;
  outline: 0;
  color: var(--tl-ink);
}
.tl-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

.tl-memory-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.tl-memory-card {
  overflow: hidden;
  border: 1px solid var(--tl-line);
  border-radius: 14px;
  background: #fff;
  transition: box-shadow 180ms ease, transform 180ms ease;
}
.tl-memory-card:hover { transform: translateY(-2px); box-shadow: 0 18px 44px rgba(20,42,29,0.09); }
.tl-card-image-wrap { position: relative; aspect-ratio: 4 / 2.6; overflow: hidden; background: #e7ece6; }
.tl-card-image { width: 100%; height: 100%; object-fit: cover; transition: transform 500ms ease; }
.tl-memory-card:hover .tl-card-image { transform: scale(1.025); }
.tl-card-image-placeholder { display: grid; width: 100%; height: 100%; place-items: center; color: var(--tl-muted); }
.tl-photo-count {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 7px;
  background: rgba(16,46,33,0.92);
  padding: 5px 9px;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
}
.tl-card-body { padding: 19px; }
.tl-card-body h3 { margin-bottom: 0; font-size: 1.45rem; font-weight: 600; line-height: 1.12; }
.tl-card-meta { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 13px; }
.tl-card-meta > span { display: flex; align-items: center; gap: 7px; color: var(--tl-muted); font-size: 0.82rem; }
.tl-review-text {
  display: -webkit-box;
  min-height: 70px;
  margin: 15px 0 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  color: #4b514d;
  font-size: 0.93rem;
  font-style: italic;
  line-height: 1.55;
}
.tl-card-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 17px; border-top: 1px solid var(--tl-line); padding-top: 13px; }
.tl-text-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 0 !important;
  border-radius: 5px !important;
  background: transparent !important;
  padding: 6px !important;
  font-size: 0.84rem !important;
  font-weight: 700;
}
.tl-text-button:hover { background: #f5f7f3 !important; }
.tl-edit-button { color: var(--tl-forest) !important; }
.tl-delete-button { color: var(--tl-terracotta) !important; }

.tl-empty-state {
  display: flex;
  min-height: 300px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed #cbd4c8;
  border-radius: 14px;
  background: #fbfcfa;
  padding: 54px 24px;
  color: var(--tl-muted);
  text-align: center;
}
.tl-empty-state > svg { color: var(--tl-terracotta); }
.tl-empty-state h3 { margin: 12px 0 0; font-size: 1.4rem; font-weight: 600; }
.tl-empty-state p { margin: 5px 0 0; font-size: 0.86rem; }

.tl-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: rgba(8,22,14,0.52);
  padding: 16px;
  backdrop-filter: blur(3px);
}
.tl-dialog {
  position: relative;
  width: min(100%, 460px);
  border-radius: 14px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 28px 90px rgba(0,0,0,0.28);
}
.tl-dialog-close { position: absolute; top: 16px; right: 16px; }
.tl-alert-icon { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 999px; background: #fff0ea; color: var(--tl-terracotta); }
.tl-dialog h2 { margin: 16px 0 0; font-size: 1.65rem; font-weight: 600; }
.tl-dialog p { margin: 8px 0 0; color: var(--tl-muted); font-size: 0.9rem; line-height: 1.65; }
.tl-dialog-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
.tl-spinner { animation: tl-spin 0.75s linear infinite; }
@keyframes tl-spin { to { transform: rotate(360deg); } }

@media (max-width: 1100px) {
  .tl-hero { grid-template-columns: 1fr 360px; }
  .tl-workspace { grid-template-columns: 380px minmax(0,1fr); }
  .tl-memory-grid { grid-template-columns: 1fr; }
}

@media (max-width: 850px) {
  .tl-hero { grid-template-columns: 1fr; align-items: start; }
  .tl-summary-panel { max-width: 480px; }
  .tl-workspace { grid-template-columns: 1fr; }
  .tl-memory-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
}

@media (max-width: 640px) {
  .tl-page { width: calc(100vw - 20px); padding-top: 12px; }
  .tl-hero { gap: 28px; }
  .tl-hero h1 { font-size: clamp(2.7rem, 13vw, 4rem); }
  .tl-desktop-break { display: none; }
  .tl-hero-text { font-size: 0.98rem; }
  .tl-workspace { margin-top: 34px; }
  .tl-form-panel { padding: 16px; }
  .tl-two-fields { grid-template-columns: 1fr; }
  .tl-list-heading { flex-direction: column; align-items: stretch; }
  .tl-search-field { width: 100%; max-width: none; }
  .tl-memory-grid { grid-template-columns: 1fr; }
  .tl-dialog-actions { flex-direction: column-reverse; }
  .tl-dialog-actions button { width: 100% !important; }
}

@media (prefers-reduced-motion: reduce) {
  .tl-page *, .tl-page *::before, .tl-page *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
`;
