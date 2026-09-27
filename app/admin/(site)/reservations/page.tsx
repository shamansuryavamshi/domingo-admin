import { getData } from "@/lib/domingo-data/store";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  let data;
  let error = "";
  try {
    data = await getData();
  } catch (e: any) {
    error = e.message || "Could not load reservations.";
  }

  const rows = data?.reservations || [];

  function fmt(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  }

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Reservations</h1>
        <p className="page-sub">Submitted from the Reserve section of the public Domingo site.</p>
      </header>

      {error && <p className="form-error show">{error}</p>}

      <div className="card">
        {rows.length === 0 ? (
          <div className="empty">No reservations yet.</div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Note</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.phone}</td>
                    <td>{r.quantity}</td>
                    <td>{r.note || "—"}</td>
                    <td style={{ color: "var(--ink-faint)", fontSize: 13 }}>{fmt(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}