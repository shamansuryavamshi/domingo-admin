import { getData } from "@/lib/domingo-data/store";
import HeroEditor from "@/components/hero-editor";

export const dynamic = "force-dynamic";

export default async function HeroPage() {
  let data;
  let error = "";
  try {
    data = await getData();
  } catch (e: any) {
    error = e.message || "Could not load data.";
  }
  const hero = data?.hero || { name: "", image: "", updatedAt: "" };

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">Hero &amp; Current Dessert</h1>
        <p className="page-sub">Set what the public Domingo site shows for this week&apos;s special.</p>
      </header>

      <HeroEditor initialHero={hero} initialError={error} />
    </>
  );
}