import { getData } from "@/lib/domingo-data/store";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  let data;
  let error = "";
  try {
    data = await getData();
  } catch (e: any) {
    error = e.message || "Could not load reviews.";
  }

  const rows = data?.reviews || [];

  function fmt(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Reviews</h1>
        <p className="page-sub">Submitted from the Reviews section of the public Domingo site.</p>
      </header>

      {error && <p className="form-error show">{error}</p>}

      <div className="card">
        {rows.length === 0 ? (
          <div className="empty">No reviews yet.</div>
        ) : (
          rows.map((r) => (
            <div className="list-row" key={r.id}>
              <div className="list-row__main">
                <strong>{r.name}</strong>
                <span>{r.text}</span>
              </div>
              <div className="list-row__meta">
                <div>{r.product || "This Sunday's dessert"}</div>
                <div>{fmt(r.createdAt)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}